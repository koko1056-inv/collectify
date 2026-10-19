-- 公式サンプルアカウント（運営のシミュレーターが動かすデモ用アカウント）を
-- 正直に見分けられるようにする。
--
-- 1) profiles.is_sample フラグ
-- 2) サンプルアカウントのユーザー名レジストリ（service_role / マイグレーションのみ書込可）
-- 3) レジストリに載っているユーザー名は自動でフラグが立ち、それ以外は本人も含めて
--    誰も is_sample を書き換えられないようにするトリガー

-- ---------------------------------------------------------------------------
-- 1. is_sample 列
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;

-- 通常ユーザーは is_admin と同様、自分では書き換えられない列にする
REVOKE UPDATE (is_sample) ON public.profiles FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. サンプルアカウントのユーザー名レジストリ
--    のちにサインアップしてくる予約済みのサンプルアカウントも拾えるよう、
--    トリガーからのみ参照する台帳。anon/authenticated には一切の権限を与えない。
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sample_account_usernames (
  username text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sample_account_usernames ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sample_account_usernames FROM anon, authenticated;

INSERT INTO public.sample_account_usernames (username) VALUES
  ('airix'), ('akizora87'), ('ame'), ('amidolabo78'), ('anya_waku'),
  ('aoi_tora'), ('aotonatsu_numa'), ('atlantis'), ('bakugo_kacchan'), ('botan'),
  ('box-himawari'), ('cabinet_nagi'), ('camp_hana'), ('chopper43'), ('cinna_milkcafe'),
  ('closet_matcha'), ('coco2'), ('coco2z'), ('corner-kamome'), ('dance_tsukimi'),
  ('diary_kesera7'), ('donguri'), ('enst_hokuto'), ('erulog88'), ('fan_wata'),
  ('fanfjord'), ('frieren_tabi'), ('fuwa_harepare'), ('fuyu'), ('hachiware_mogu'),
  ('hagu'), ('hako-yui5'), ('hall_window2'), ('haru'), ('hiloto8'),
  ('hina'), ('hiyoko'), ('hokkoripark'), ('hoku_oshi'), ('hoshikuzu'),
  ('ichigo26'), ('ika'), ('inferno-story9z'), ('inumaki_diary0'), ('jam'),
  ('kaede_ichigo'), ('kageyama_toss'), ('karasu'), ('kiiro_shelf'), ('kira6'),
  ('koara6'), ('kobato_stock'), ('korokoronest14'), ('kosumosbotan'), ('kota'),
  ('kotekotechiyo'), ('kujira'), ('kuriimu'), ('kurimanju_nomu'), ('kuro'),
  ('kuromi_dayo'), ('kurumi'), ('kuzuha_oshi_ren'), ('lilac_tsubaki18'), ('magic5'),
  ('mao-renge'), ('marine_ahoy_3'), ('matcha_yuzu'), ('megu_tsumiki'), ('mga0'),
  ('midori5'), ('mikan-base0'), ('mimi'), ('mio'), ('mofu3x'),
  ('mogura'), ('momo75'), ('motokizukan'), ('mrs_green_jam'), ('nagi_lazy10'),
  ('nagomi'), ('nana'), ('nikonikostage3'), ('noriz'), ('note_nokko'),
  ('nozomi'), ('numamomo'), ('okashi62'), ('pafe-neko'), ('panda'),
  ('pero_ajisai6'), ('piccolocamp57'), ('pocket_mochi'), ('pokacamp0'), ('pokopoko'),
  ('powersumire'), ('purin7'), ('pyon-ginnan'), ('rengoku_umai'), ('renringo4'),
  ('riku-yozora40'), ('ringojam-asahi'), ('ruby_hoshino_b'), ('ruri_log'), ('ryoka_nemu'),
  ('ryotasuzume17'), ('same2-harbor'), ('sana-choco'), ('satoru_6eyes'), ('senbei'),
  ('shiropocket'), ('shizuku-days'), ('shoga'), ('sorakoya'), ('soranji'),
  ('sota'), ('soyo'), ('suisei_comet'), ('suzume3'), ('tako'),
  ('tama2'), ('tamakoya'), ('tampopo'), ('tanurin'), ('tonton6'),
  ('tori'), ('tripharuno10'), ('usagi_yaha'), ('usagix'), ('vault-usa'),
  ('wagashi'), ('wata_fuqurou'), ('wave_matcha'), ('yamato9'), ('yoru_botan'),
  ('yoruhato'), ('yuuhi'), ('zenjin'), ('zoro_maigo'), ('zukanokashi')
ON CONFLICT (username) DO NOTHING;

-- 既存プロフィールのバックフィル
UPDATE public.profiles
   SET is_sample = true
 WHERE lower(username) IN (SELECT username FROM public.sample_account_usernames)
   AND is_sample IS DISTINCT FROM true;

-- ---------------------------------------------------------------------------
-- 3. レジストリ連動トリガー
--    - レジストリに載っているユーザー名なら、INSERT/UPDATE を問わず is_sample = true を強制する
--      （サインアップがレジストリ登録より後でも自動で付く）
--    - それ以外は、service_role 以外の呼び出し元が is_sample を書き換えても無視する
--      （UPDATE なら OLD の値を維持、INSERT なら false のまま）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_profile_is_sample()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.username IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.sample_account_usernames s
     WHERE s.username = lower(NEW.username)
  ) THEN
    NEW.is_sample := true;
  ELSIF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF TG_OP = 'UPDATE' THEN
      NEW.is_sample := OLD.is_sample;
    ELSE
      NEW.is_sample := false;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_profile_is_sample() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER profiles_enforce_is_sample
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_is_sample();

-- ---------------------------------------------------------------------------
-- 4. 他人のプロフィール情報を返す既存の RPC に is_sample を足す
--    （列を増やすだけで、返す行・並び順は変えない。CREATE OR REPLACE のまま差し替え）
-- ---------------------------------------------------------------------------

-- 新着ストリップ
-- 列を増やすので CREATE OR REPLACE の前に一度落とす（戻り値の列構成は CREATE OR REPLACE だけでは変えられない）
DROP FUNCTION IF EXISTS public.get_recent_registrations(integer);
CREATE OR REPLACE FUNCTION public.get_recent_registrations(_limit integer DEFAULT 12)
RETURNS TABLE (
  user_item_id uuid,
  official_item_id uuid,
  title text,
  image text,
  content_name text,
  created_at timestamptz,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  is_sample boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT ui.id, ui.official_item_id,
         coalesce(oi.title, ui.title), coalesce(ui.image, oi.image),
         coalesce(nullif(btrim(ui.content_name), ''), oi.content_name),
         ui.created_at, p.id, p.username, p.display_name, p.avatar_url, p.is_sample
  FROM public.user_items ui
  JOIN public.profiles p ON p.id = ui.user_id
  LEFT JOIN public.official_items oi ON oi.id = ui.official_item_id
  WHERE p.privacy_level = 'public'
    AND coalesce(ui.image, oi.image) IS NOT NULL
  ORDER BY ui.created_at DESC
  LIMIT least(greatest(_limit, 1), 40);
$function$;
REVOKE ALL ON FUNCTION public.get_recent_registrations(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_recent_registrations(integer) TO authenticated;

-- 自分の推し部屋にいいねした人
DROP FUNCTION IF EXISTS public.get_my_oshi_room_likers(integer, integer);
CREATE OR REPLACE FUNCTION public.get_my_oshi_room_likers(_limit integer DEFAULT 50, _offset integer DEFAULT 0)
RETURNS TABLE (user_id uuid, username text, display_name text, avatar_url text, is_sample boolean, liked_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.is_sample, l.created_at
  FROM public.oshi_room_likes l
  JOIN public.profiles p ON p.id = l.user_id
  WHERE l.room_owner_id = auth.uid()
    AND NOT public.is_blocked_between(auth.uid(), l.user_id)
  ORDER BY l.created_at DESC, l.user_id
  LIMIT least(greatest(coalesce(_limit, 50), 1), 100)
  OFFSET greatest(coalesce(_offset, 0), 0);
$$;
REVOKE ALL ON FUNCTION public.get_my_oshi_room_likers(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_oshi_room_likers(integer, integer) TO authenticated;

-- 「みんな」の「お部屋」タブの一覧
DROP FUNCTION IF EXISTS public.list_oshi_rooms(text, integer, integer);
CREATE OR REPLACE FUNCTION public.list_oshi_rooms(_sort text DEFAULT 'new', _limit integer DEFAULT 24, _offset integer DEFAULT 0)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  is_sample boolean,
  wallpaper_key text,
  floor_key text,
  layout jsonb,
  oshi_color text,
  goods jsonb,
  bond_total integer,
  bond_best integer,
  likes integer,
  liked_by_me boolean,
  match_score integer,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      auth.uid() AS me,
      CASE WHEN _sort IN ('new', 'popular', 'oshi') THEN _sort ELSE 'new' END AS sort,
      least(greatest(coalesce(_limit, 24), 1), 48) AS lim,
      greatest(coalesce(_offset, 0), 0) AS off
  ),
  my_keys AS (
    -- 自分の「推し」の作品名（小文字・前後の空白なし）。同じ推しの並びのときだけ使う
    SELECT DISTINCT lower(btrim(s.k)) AS k
    FROM (
      SELECT unnest(coalesce(p.favorite_contents, '{}'::text[]) || coalesce(p.interests, '{}'::text[])) AS k
      FROM public.profiles p, params
      WHERE p.id = params.me AND params.sort = 'oshi'
      UNION ALL
      SELECT ui.content_name
      FROM public.profiles p
      CROSS JOIN params
      CROSS JOIN LATERAL unnest(p.favorite_item_ids) AS f(id)
      JOIN public.user_items ui ON ui.id = f.id AND ui.user_id = p.id
      WHERE p.id = params.me AND params.sort = 'oshi'
    ) s
    WHERE s.k IS NOT NULL AND btrim(s.k) NOT IN ('', 'なし')
  ),
  cand AS (
    SELECT p.id, p.favorite_item_ids, r.updated_at AS room_at
    FROM public.profiles p
    CROSS JOIN params
    LEFT JOIN public.oshi_rooms r ON r.user_id = p.id
    WHERE cardinality(p.favorite_item_ids) > 0
      AND p.id IS DISTINCT FROM params.me
      AND (
        p.privacy_level = 'public'
        OR (
          p.privacy_level = 'followers'
          AND EXISTS (SELECT 1 FROM public.follows fo WHERE fo.follower_id = params.me AND fo.following_id = p.id)
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_blocks b
        WHERE (b.blocker_id = params.me AND b.blocked_id = p.id)
           OR (b.blocker_id = p.id AND b.blocked_id = params.me)
      )
  ),
  scored AS (
    SELECT
      c.id,
      c.room_at IS NOT NULL AS saved,
      coalesce(c.room_at, g.oshi_at) AS sort_at,
      (SELECT count(*)::int FROM public.oshi_room_likes l WHERE l.room_owner_id = c.id) AS likes,
      CASE WHEN params.sort = 'oshi'
        THEN (SELECT count(*)::int FROM unnest(g.content_keys) AS ck(k) WHERE ck.k IN (SELECT mk.k FROM my_keys mk))
        ELSE 0
      END AS match_score
    FROM cand c
    CROSS JOIN params
    CROSS JOIN LATERAL (
      SELECT
        count(*) AS n_goods,
        array_agg(DISTINCT lower(btrim(ui.content_name))) FILTER (WHERE ui.content_name IS NOT NULL AND btrim(ui.content_name) <> '') AS content_keys,
        max(cg.created_at) AS oshi_at
      FROM unnest(c.favorite_item_ids) AS f(id)
      JOIN public.user_items ui ON ui.id = f.id AND ui.user_id = c.id
      LEFT JOIN public.companion_goods cg ON cg.user_id = c.id AND cg.user_item_id = f.id
    ) g
    WHERE g.n_goods > 0
  ),
  page AS (
    SELECT s.*,
      row_number() OVER (
        ORDER BY
          CASE WHEN params.sort = 'oshi' THEN s.match_score END DESC NULLS LAST,
          CASE WHEN params.sort IN ('popular', 'oshi') THEN s.likes END DESC NULLS LAST,
          -- 新着では、保存した部屋を先に（基本の配置のままの部屋は後ろ）
          CASE WHEN params.sort = 'new' THEN s.saved END DESC NULLS LAST,
          s.sort_at DESC NULLS LAST,
          s.id
      ) AS ord
    FROM scored s
    CROSS JOIN params
    WHERE params.sort <> 'oshi' OR s.match_score > 0
    ORDER BY ord
    LIMIT (SELECT lim FROM params)
    OFFSET (SELECT off FROM params)
  )
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.is_sample,
    r.wallpaper_key,
    r.floor_key,
    CASE WHEN r.layout IS NULL THEN NULL ELSE
      jsonb_set(r.layout, '{goods}', coalesce((
        SELECT jsonb_agg(lg.value ORDER BY lg.ord)
        FROM jsonb_array_elements(coalesce(r.layout -> 'goods', '[]'::jsonb)) WITH ORDINALITY AS lg(value, ord)
        WHERE (lg.value ->> 'item') = ANY (coalesce(p.favorite_item_ids, ARRAY[]::uuid[])::text[])
      ), '[]'::jsonb))
    END,
    p.profile_oshi_color,
    gs.goods,
    gs.bond_total,
    gs.bond_best,
    pg.likes,
    EXISTS (SELECT 1 FROM public.oshi_room_likes l WHERE l.room_owner_id = p.id AND l.user_id = auth.uid()),
    pg.match_score,
    pg.sort_at
  FROM page pg
  JOIN public.profiles p ON p.id = pg.id
  LEFT JOIN public.oshi_rooms r ON r.user_id = p.id
  CROSS JOIN LATERAL (
    SELECT
      coalesce(jsonb_agg(jsonb_build_object(
        'user_item_id', x.id,
        'title', x.title,
        'image', x.image,
        'content_name', x.content_name,
        'level', x.level,
        'rank', x.rank_no
      ) ORDER BY x.rank_no), '[]'::jsonb) AS goods,
      coalesce(sum(x.level), 0)::int AS bond_total,
      coalesce(max(x.level), 0)::int AS bond_best
    FROM (
      SELECT ui.id, ui.title, ui.image, ui.content_name,
             public.companion_level(coalesce(cg.xp, 0)) AS level,
             (row_number() OVER (ORDER BY f.ord))::int AS rank_no
      FROM unnest(p.favorite_item_ids) WITH ORDINALITY AS f(id, ord)
      JOIN public.user_items ui ON ui.id = f.id AND ui.user_id = p.id
      LEFT JOIN public.companion_goods cg ON cg.user_id = p.id AND cg.user_item_id = f.id
      ORDER BY f.ord
      LIMIT 5
    ) x
  ) gs
  ORDER BY pg.ord;
$$;
REVOKE ALL ON FUNCTION public.list_oshi_rooms(text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_oshi_rooms(text, integer, integer) TO authenticated;

-- マッチ（両想い・片想い）
DROP FUNCTION IF EXISTS public.find_trade_matches(integer);
CREATE OR REPLACE FUNCTION public.find_trade_matches(_limit integer DEFAULT 30)
 RETURNS TABLE(partner_id uuid, partner_username text, partner_avatar_url text, partner_is_sample boolean, is_mutual boolean, their_items jsonb, my_items jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH my_wish AS (
    SELECT w.official_item_id, w.original_item_id
    FROM public.wishlists w
    WHERE w.user_id = auth.uid()
  ),
  my_offer AS (
    SELECT ui.id, ui.title, ui.image, ui.official_item_id, ui.original_item_id
    FROM public.user_items ui
    WHERE ui.user_id = auth.uid()
      AND ui.for_trade
  ),
  hidden AS (
    SELECT b.blocked_id AS uid FROM public.user_blocks b WHERE b.blocker_id = auth.uid()
    UNION
    SELECT b.blocker_id AS uid FROM public.user_blocks b WHERE b.blocked_id = auth.uid()
  ),
  they_have AS (
    SELECT DISTINCT ui.user_id AS pid, ui.id, ui.title, ui.image
    FROM public.user_items ui
    JOIN my_wish w
      ON (w.official_item_id IS NOT NULL AND w.official_item_id = ui.official_item_id)
      OR (w.original_item_id IS NOT NULL AND w.original_item_id = ui.original_item_id)
    WHERE ui.user_id <> auth.uid()
      AND ui.for_trade
      AND ui.user_id NOT IN (SELECT h.uid FROM hidden h)
  ),
  they_want AS (
    SELECT DISTINCT w.user_id AS pid, m.id, m.title, m.image
    FROM public.wishlists w
    JOIN my_offer m
      ON (w.official_item_id IS NOT NULL AND w.official_item_id = m.official_item_id)
      OR (w.original_item_id IS NOT NULL AND w.original_item_id = m.original_item_id)
    WHERE w.user_id <> auth.uid()
      AND w.user_id NOT IN (SELECT h.uid FROM hidden h)
  ),
  partners AS (
    SELECT h.pid FROM they_have h
    UNION
    SELECT t.pid FROM they_want t
  )
  SELECT
    p.pid,
    pr.username,
    pr.avatar_url,
    pr.is_sample,
    (h.items IS NOT NULL AND t.items IS NOT NULL) AS is_mutual,
    COALESCE(h.items, '[]'::jsonb),
    COALESCE(t.items, '[]'::jsonb)
  FROM partners p
  JOIN public.profiles pr ON pr.id = p.pid
  LEFT JOIN LATERAL (
    -- 注目中の品を先に（8件で切るので、後ろに回ると見えなくなる）
    SELECT jsonb_agg(jsonb_build_object('id', x.id, 'title', x.title, 'image', x.image) ORDER BY x.spot DESC) AS items
    FROM (
      SELECT h2.id, h2.title, h2.image, public.trade_spotlight_covers(h2.pid, h2.id) AS spot
      FROM they_have h2 WHERE h2.pid = p.pid
      ORDER BY 4 DESC
      LIMIT 8
    ) x
  ) h ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object('id', y.id, 'title', y.title, 'image', y.image)) AS items
    FROM (SELECT t2.id, t2.title, t2.image FROM they_want t2 WHERE t2.pid = p.pid LIMIT 8) y
  ) t ON true
  ORDER BY (h.items IS NOT NULL AND t.items IS NOT NULL) DESC,
           public.trade_spotlight_user(p.pid) DESC,
           jsonb_array_length(COALESCE(h.items, '[]'::jsonb))
             + jsonb_array_length(COALESCE(t.items, '[]'::jsonb)) DESC,
           pr.username
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 30), 100));
$function$;
REVOKE ALL ON FUNCTION public.find_trade_matches(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_trade_matches(integer) TO authenticated;

-- 同じ作品を集めている人
DROP FUNCTION IF EXISTS public.find_trade_series_partners(integer);
CREATE OR REPLACE FUNCTION public.find_trade_series_partners(_limit integer DEFAULT 20)
 RETURNS TABLE(partner_id uuid, partner_username text, partner_avatar_url text, partner_is_sample boolean, shared_series text[], their_items jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with item_series as (
    select ui.user_id, ui.id as item_id, ui.title, ui.image,
           btrim(ui.content_name) as series_label,
           lower(btrim(ui.content_name)) as series_key,
           ui.for_trade
    from public.user_items ui
    where ui.content_name is not null and btrim(ui.content_name) <> ''
    union
    select ui.user_id, ui.id, ui.title, ui.image,
           btrim(oi.content_name), lower(btrim(oi.content_name)), ui.for_trade
    from public.user_items ui
    join public.official_items oi on oi.id = ui.official_item_id
    where oi.content_name is not null and btrim(oi.content_name) <> ''
    union
    select ui.user_id, ui.id, ui.title, ui.image,
           btrim(t.name), lower(btrim(t.name)), ui.for_trade
    from public.user_items ui
    join public.item_tags it on it.official_item_id = ui.official_item_id
    join public.tags t on t.id = it.tag_id and t.category = 'series'
    where t.name is not null and btrim(t.name) <> ''
  ),
  wish_series as (
    select lower(btrim(oi.content_name)) as series_key
    from public.wishlists w
    join public.official_items oi on oi.id = w.official_item_id
    where w.user_id = auth.uid()
      and oi.content_name is not null and btrim(oi.content_name) <> ''
    union
    select lower(btrim(t.name))
    from public.wishlists w
    join public.item_tags it on it.official_item_id = w.official_item_id
    join public.tags t on t.id = it.tag_id and t.category = 'series'
    where w.user_id = auth.uid()
      and t.name is not null and btrim(t.name) <> ''
  ),
  my_series as (
    select distinct s.series_key
    from item_series s
    where s.user_id = auth.uid()
    union
    select distinct w.series_key from wish_series w
  ),
  hidden as (
    select b.blocked_id as uid from public.user_blocks b where b.blocker_id = auth.uid()
    union
    select b.blocker_id as uid from public.user_blocks b where b.blocked_id = auth.uid()
  ),
  theirs as (
    select distinct s.user_id as pid, s.item_id, s.title, s.image, s.series_label
    from item_series s
    join my_series m on m.series_key = s.series_key
    where s.user_id <> auth.uid()
      and s.for_trade
      and s.user_id not in (select h.uid from hidden h)
  )
  select
    x.pid,
    pr.username,
    pr.avatar_url,
    pr.is_sample,
    x.series_list,
    x.items
  from (
    select
      t.pid,
      (array_agg(distinct t.series_label))[1:4] as series_list,
      jsonb_agg(distinct jsonb_build_object('id', t.item_id, 'title', t.title, 'image', t.image))
        as items,
      count(distinct t.item_id) as n,
      public.trade_spotlight_user(t.pid) as spot
    from theirs t
    group by t.pid
  ) x
  join public.profiles pr on pr.id = x.pid
  where pr.privacy_level = 'public'
  order by x.spot desc, x.n desc, pr.username
  limit greatest(1, least(coalesce(_limit, 20), 50));
$function$;
revoke all on function public.find_trade_series_partners(integer) from public, anon;
grant execute on function public.find_trade_series_partners(integer) to authenticated;

-- ほしいものを持っている人（holders は jsonb 配列。各要素に is_sample を足す。
-- 戻り値の列構成そのものは変えていないので DROP FUNCTION は不要）
CREATE OR REPLACE FUNCTION public.find_holders_for_my_wishes(_limit integer DEFAULT 40)
 RETURNS TABLE(wish_id uuid, official_item_id uuid, title text, image text, content_name text, holder_count integer, trade_ok_count integer, holders jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH hidden AS (
    SELECT b.blocked_id AS uid FROM public.user_blocks b WHERE b.blocker_id = auth.uid()
    UNION
    SELECT b.blocker_id AS uid FROM public.user_blocks b WHERE b.blocked_id = auth.uid()
  ),
  cand AS (
    SELECT w.id AS wid, w.official_item_id AS oid,
           ui.id AS uiid, ui.user_id AS uid, ui.for_trade, ui.quantity,
           pr.username, pr.display_name, pr.avatar_url, pr.is_sample,
           COALESCE(ts.trade_score, 0) AS tscore, COALESCE(ts.trade_count, 0) AS tcount,
           EXISTS (
             SELECT 1 FROM public.trade_requests tr
             WHERE tr.sender_id = auth.uid() AND tr.requested_item_id = ui.id
               AND tr.status IN ('pending', 'accepted')
           ) AS already_requested,
           public.trade_item_in_progress(ui.id) AS busy,
           (ui.for_trade AND public.trade_spotlight_covers(ui.user_id, ui.id)) AS spot
    FROM public.wishlists w
    JOIN public.user_items ui ON ui.official_item_id = w.official_item_id AND ui.user_id <> auth.uid()
    JOIN public.profiles pr ON pr.id = ui.user_id
    LEFT JOIN public.user_trust_scores ts ON ts.user_id = ui.user_id
    WHERE w.user_id = auth.uid()
      AND w.official_item_id IS NOT NULL
      AND ui.user_id NOT IN (SELECT h.uid FROM hidden h)
      AND (pr.privacy_level::text = 'public'
           OR (pr.privacy_level::text = 'followers' AND EXISTS (
                 SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = pr.id)))
  )
  SELECT
    c.wid,
    oi.id,
    oi.title,
    oi.image,
    oi.content_name,
    count(*)::integer,
    (count(*) FILTER (WHERE c.for_trade AND NOT c.busy))::integer,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', x.uid,
        'username', x.username,
        'display_name', x.display_name,
        'avatar_url', x.avatar_url,
        'is_sample', x.is_sample,
        'user_item_id', x.uiid,
        'for_trade', x.for_trade,
        'quantity', x.quantity,
        'trade_score', x.tscore,
        'trade_count', x.tcount,
        'already_requested', x.already_requested,
        'busy', x.busy,
        'spotlight', (x.spot AND NOT x.busy)
      ) ORDER BY x.ord)
      FROM (
        SELECT c2.*, row_number() OVER (
                 ORDER BY (c2.spot AND NOT c2.busy) DESC,
                          (c2.for_trade AND NOT c2.busy) DESC, c2.busy ASC, c2.tcount DESC, c2.quantity DESC, c2.username
               ) AS ord
        FROM cand c2 WHERE c2.wid = c.wid
        ORDER BY ord
        LIMIT 6
      ) x
    )
  FROM cand c
  JOIN public.official_items oi ON oi.id = c.oid
  GROUP BY c.wid, oi.id, oi.title, oi.image, oi.content_name
  ORDER BY 7 DESC, 6 DESC, oi.title
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 40), 100));
$function$;
