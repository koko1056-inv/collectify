-- グッズ起点の交流: 「同じグッズを持ってる人／ほしい人」と「交換できるかも」
--
-- グッズのページ（/item/:id とアプリ内のグッズ詳細）から、同じグッズが好きな人に出会えるようにする。
-- 一覧は表の RLS をゆるめず、絞り込みを中に書いた SECURITY DEFINER の関数だけで出す。
--
--  1. profiles.show_on_goods_pages: 「グッズのページに自分を表示する」（既定はオン）。
--     オフにすると、持ってる人・ほしい人の一覧・アイコン・交換できるかもに出なくなる（人数には名前なしで入る）。
--  2. get_goods_people_summary(_item_id): 人数と、先頭に並べるアイコン（5人まで）を 1 回で返す。
--     人数は「持ってる・ほしいの登録の数（人単位）」で、名前を出さない人も数に入れる（誰かは分からない）。
--     アイコンと一覧に出すのは、次をすべて満たす人だけ（_goods_people_visible）:
--       - プロフィールが公開、またはフォロワー限定で自分がフォローしている（can_view_collection と同じ考え方）
--       - show_on_goods_pages がオン
--       - 自分とのあいだにブロックがない（どちら向きでも）
--     ゲスト（anon）には人数だけを返す（アイコンは返さない。user_items はもともとログインした人だけが読める）。
--  3. get_goods_people(_item_id, _kind, _limit, _offset): 持ってる人／ほしい人の一覧（ページ送り）。ログインした人だけ。
--     自分は一覧に入れない（自分の状態は summary の me_* で返す）。フォロー中の人・交換に出している人を先に並べる。
--  4. get_goods_trade_candidates(_item_id, _limit): 「交換できるかも」。ログインした人だけ。
--       - want_from: 自分がほしい（ウィッシュリスト）→ このグッズを交換に出している人
--       - offer_to : 自分が交換に出している → このグッズをほしい人
--     公式サンプルアカウントと実ユーザーは組ませない（どちら向きでも。is_sample が自分と同じ人だけ）。
--     交換の申し込みそのもの（create_trade_request）は変えない。
--  統合されたグッズ（official_items.merged_into）は、統合先に寄せて数える（統合済みの id で呼ばれても統合先を見る）。

-- ─────────────────────────────── 1. 表示のオプトアウト ───────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_on_goods_pages boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.show_on_goods_pages IS
  'グッズのページの「持ってる人・ほしい人」「交換できるかも」に自分を表示するか。オフでも人数には名前なしで入る';

-- 一覧を引くための索引（グッズ → 人）。ほとんどは既にあるので、無いときだけ作る
CREATE INDEX IF NOT EXISTS idx_user_items_official_item_id ON public.user_items (official_item_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_official_item_id ON public.wishlists (official_item_id);

-- ─────────────────────────────── 2. 共通の部品 ───────────────────────────────

-- 統合を辿った先の id と、そこへ統合された id をまとめて返す（統合は行を消さず merged_into を書くだけなので）
CREATE OR REPLACE FUNCTION public._goods_item_ids(_item_id uuid)
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  WITH RECURSIVE up AS (
    SELECT oi.id, oi.merged_into, 1 AS depth FROM public.official_items oi WHERE oi.id = _item_id
    UNION ALL
    SELECT oi.id, oi.merged_into, up.depth + 1
    FROM public.official_items oi JOIN up ON oi.id = up.merged_into
    WHERE up.depth < 5
  ),
  root AS (
    SELECT COALESCE((SELECT u.id FROM up u WHERE u.merged_into IS NULL ORDER BY u.depth LIMIT 1), _item_id) AS id
  )
  SELECT array_agg(DISTINCT x.id)
  FROM (
    SELECT r.id FROM root r
    UNION ALL
    SELECT oi.id FROM public.official_items oi, root r WHERE oi.merged_into = r.id
  ) x;
$function$;
REVOKE ALL ON FUNCTION public._goods_item_ids(uuid) FROM PUBLIC, anon, authenticated;

-- 自分（_viewer）から見て、グッズのページに名前とアイコンを出してよい人か
CREATE OR REPLACE FUNCTION public._goods_people_visible(_viewer uuid, _uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT _viewer IS NOT NULL
    AND _uid IS NOT NULL
    AND _uid <> _viewer
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = _uid
        AND p.show_on_goods_pages
        AND (p.privacy_level::text = 'public'
             OR (p.privacy_level::text = 'followers' AND EXISTS (
                   SELECT 1 FROM public.follows f WHERE f.follower_id = _viewer AND f.following_id = p.id)))
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks b
      WHERE (b.blocker_id = _viewer AND b.blocked_id = _uid)
         OR (b.blocker_id = _uid AND b.blocked_id = _viewer)
    );
$function$;
REVOKE ALL ON FUNCTION public._goods_people_visible(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- ─────────────────────────────── 3. 人数とアイコン ───────────────────────────────

CREATE OR REPLACE FUNCTION public.get_goods_people_summary(_item_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  WITH ids AS (
    SELECT unnest(public._goods_item_ids(_item_id)) AS id
  ),
  owners AS (
    SELECT ui.user_id, bool_or(ui.for_trade) AS for_trade, max(ui.created_at) AS at
    FROM public.user_items ui
    WHERE ui.official_item_id IN (SELECT id FROM ids)
    GROUP BY ui.user_id
  ),
  wishers AS (
    SELECT w.user_id, max(w.created_at) AS at
    FROM public.wishlists w
    WHERE w.official_item_id IN (SELECT id FROM ids)
    GROUP BY w.user_id
  ),
  -- アイコンは名前を出してよい人だけ。ゲストには出さない（auth.uid() が NULL なら _goods_people_visible は偽）
  owner_faces AS (
    SELECT o.user_id, o.for_trade, o.at FROM owners o
    WHERE public._goods_people_visible(auth.uid(), o.user_id)
  ),
  wisher_faces AS (
    SELECT w.user_id, w.at FROM wishers w
    WHERE public._goods_people_visible(auth.uid(), w.user_id)
  )
  SELECT jsonb_build_object(
    'owners_count', (SELECT count(*) FROM owners)::integer,
    'wishers_count', (SELECT count(*) FROM wishers)::integer,
    'for_trade_count', (SELECT count(*) FROM owners o WHERE o.for_trade)::integer,
    -- 一覧に出る人数（名前を出さない人・ブロック関係・自分を除いた数）。ゲストは 0
    'owners_listed', (SELECT count(*) FROM owner_faces)::integer,
    'wishers_listed', (SELECT count(*) FROM wisher_faces)::integer,
    'owner_faces', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url))
      FROM (
        SELECT f.user_id FROM owner_faces f
        ORDER BY EXISTS (SELECT 1 FROM public.follows fl WHERE fl.follower_id = auth.uid() AND fl.following_id = f.user_id) DESC,
                 (SELECT pr.avatar_url IS NOT NULL FROM public.profiles pr WHERE pr.id = f.user_id) DESC,
                 f.at DESC
        LIMIT 5
      ) t JOIN public.profiles p ON p.id = t.user_id
    ), '[]'::jsonb),
    'wisher_faces', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url))
      FROM (
        SELECT f.user_id FROM wisher_faces f
        ORDER BY EXISTS (SELECT 1 FROM public.follows fl WHERE fl.follower_id = auth.uid() AND fl.following_id = f.user_id) DESC,
                 (SELECT pr.avatar_url IS NOT NULL FROM public.profiles pr WHERE pr.id = f.user_id) DESC,
                 f.at DESC
        LIMIT 5
      ) t JOIN public.profiles p ON p.id = t.user_id
    ), '[]'::jsonb),
    'me_owns', auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM owners o WHERE o.user_id = auth.uid()),
    'me_wishes', auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM wishers w WHERE w.user_id = auth.uid()),
    'me_for_trade', auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM owners o WHERE o.user_id = auth.uid() AND o.for_trade)
  );
$function$;
COMMENT ON FUNCTION public.get_goods_people_summary(uuid) IS
  'グッズのページの「持ってる人・ほしい人」の人数と先頭のアイコン。人数は全員（名前なし）、アイコンは表示してよい人だけ。ゲストは人数のみ';
REVOKE ALL ON FUNCTION public.get_goods_people_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_goods_people_summary(uuid) TO anon, authenticated;

-- ─────────────────────────────── 4. 一覧（ページ送り） ───────────────────────────────

DROP FUNCTION IF EXISTS public.get_goods_people(uuid, text, integer, integer);
CREATE OR REPLACE FUNCTION public.get_goods_people(_item_id uuid, _kind text, _limit integer DEFAULT 20, _offset integer DEFAULT 0)
 RETURNS TABLE(
   user_id uuid,
   username text,
   display_name text,
   avatar_url text,
   is_sample boolean,
   quantity integer,
   for_trade boolean,
   trade_item_id uuid,
   series_count integer,
   is_following boolean,
   added_at timestamptz
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  WITH ids AS (
    SELECT unnest(public._goods_item_ids(_item_id)) AS id
  ),
  item AS (
    SELECT NULLIF(lower(btrim(oi.content_name)), '') AS series
    FROM public.official_items oi WHERE oi.id = _item_id
  ),
  people AS (
    SELECT ui.user_id,
           sum(GREATEST(ui.quantity, 1))::integer AS quantity,
           bool_or(ui.for_trade) AS for_trade,
           -- 交換を申し込むときの宛先（交換に出している 1 点を優先）
           (array_agg(ui.id ORDER BY ui.for_trade DESC, ui.created_at DESC))[1] AS trade_item_id,
           max(ui.created_at) AS at
    FROM public.user_items ui
    WHERE _kind = 'owners' AND ui.official_item_id IN (SELECT id FROM ids)
    GROUP BY ui.user_id
    UNION ALL
    SELECT w.user_id, NULL::integer, false, NULL::uuid, max(w.created_at)
    FROM public.wishlists w
    WHERE _kind = 'wishers' AND w.official_item_id IN (SELECT id FROM ids)
    GROUP BY w.user_id
  ),
  visible AS (
    SELECT pe.*, EXISTS (
             SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = pe.user_id
           ) AS following
    FROM people pe
    WHERE public._goods_people_visible(auth.uid(), pe.user_id)
  ),
  page AS (
    SELECT v.* FROM visible v
    ORDER BY v.following DESC, v.for_trade DESC, v.at DESC, v.user_id
    LIMIT GREATEST(1, LEAST(COALESCE(_limit, 20), 50))
    OFFSET GREATEST(0, COALESCE(_offset, 0))
  )
  SELECT pg.user_id, p.username, p.display_name, p.avatar_url, p.is_sample,
         pg.quantity, pg.for_trade, pg.trade_item_id,
         -- 同じ作品のグッズを何個持っているか（ページの人数ぶんだけ数える）
         CASE WHEN (SELECT series FROM item) IS NULL THEN NULL ELSE (
           SELECT count(*)::integer FROM public.user_items u2
           LEFT JOIN public.official_items o2 ON o2.id = u2.official_item_id
           WHERE u2.user_id = pg.user_id
             AND lower(btrim(COALESCE(o2.content_name, u2.content_name))) = (SELECT series FROM item)
         ) END,
         pg.following, pg.at
  FROM page pg
  JOIN public.profiles p ON p.id = pg.user_id
  WHERE auth.uid() IS NOT NULL
    AND _kind IN ('owners', 'wishers')
  ORDER BY pg.following DESC, pg.for_trade DESC, pg.at DESC, pg.user_id;
$function$;
COMMENT ON FUNCTION public.get_goods_people(uuid, text, integer, integer) IS
  'グッズの「持ってる人」(_kind=owners)・「ほしい人」(_kind=wishers) の一覧。表示してよい人だけ・自分は除く。ログインした人だけ';
REVOKE ALL ON FUNCTION public.get_goods_people(uuid, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_goods_people(uuid, text, integer, integer) TO authenticated;

-- ─────────────────────────────── 5. 交換できるかも ───────────────────────────────

DROP FUNCTION IF EXISTS public.get_goods_trade_candidates(uuid, integer);
CREATE OR REPLACE FUNCTION public.get_goods_trade_candidates(_item_id uuid, _limit integer DEFAULT 6)
 RETURNS TABLE(
   direction text,
   partner_id uuid,
   username text,
   display_name text,
   avatar_url text,
   partner_item_id uuid,
   partner_item_title text,
   partner_item_image text,
   my_item_id uuid
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  WITH ids AS (
    SELECT unnest(public._goods_item_ids(_item_id)) AS id
  ),
  me AS (
    SELECT p.id, p.is_sample FROM public.profiles p WHERE p.id = auth.uid()
  ),
  i_want AS (
    SELECT EXISTS (
      SELECT 1 FROM public.wishlists w WHERE w.user_id = auth.uid() AND w.official_item_id IN (SELECT id FROM ids)
    ) AS yes
  ),
  my_offer AS (
    SELECT ui.id FROM public.user_items ui
    WHERE ui.user_id = auth.uid() AND ui.for_trade AND ui.official_item_id IN (SELECT id FROM ids)
    ORDER BY ui.created_at DESC
    LIMIT 1
  ),
  -- 自分がほしい → このグッズを交換に出している人（申し込み先はその人のこのグッズ）
  want_from AS (
    SELECT DISTINCT ON (ui.user_id)
           'want_from'::text AS direction, ui.user_id AS pid, ui.id AS their_item, NULL::uuid AS mine, ui.created_at AS at
    FROM public.user_items ui
    WHERE (SELECT yes FROM i_want)
      AND ui.for_trade
      AND ui.official_item_id IN (SELECT id FROM ids)
      AND NOT public.trade_item_in_progress(ui.id)
    ORDER BY ui.user_id, ui.created_at DESC
  ),
  -- 自分が交換に出している → このグッズをほしい人（申し込み先は相手が交換に出している品のどれか。無ければ NULL）
  offer_to AS (
    SELECT DISTINCT ON (w.user_id)
           'offer_to'::text AS direction, w.user_id AS pid,
           (SELECT u3.id FROM public.user_items u3
             WHERE u3.user_id = w.user_id AND u3.for_trade AND NOT public.trade_item_in_progress(u3.id)
             ORDER BY EXISTS (SELECT 1 FROM public.wishlists mw
                               WHERE mw.user_id = auth.uid() AND mw.official_item_id = u3.official_item_id) DESC,
                      u3.created_at DESC
             LIMIT 1) AS their_item,
           (SELECT m.id FROM my_offer m) AS mine,
           w.created_at AS at
    FROM public.wishlists w
    WHERE EXISTS (SELECT 1 FROM my_offer)
      AND w.official_item_id IN (SELECT id FROM ids)
    ORDER BY w.user_id, w.created_at DESC
  ),
  cand AS (
    SELECT * FROM want_from
    UNION ALL
    SELECT * FROM offer_to
  )
  SELECT c.direction, c.pid, p.username, p.display_name, p.avatar_url,
         c.their_item, ti.title, ti.image, c.mine
  FROM cand c
  JOIN public.profiles p ON p.id = c.pid
  JOIN me ON true
  LEFT JOIN public.user_items ti ON ti.id = c.their_item
  WHERE public._goods_people_visible(auth.uid(), c.pid)
    -- 公式サンプルアカウントと実ユーザーは組ませない（どちら向きでも）
    AND p.is_sample = me.is_sample
  ORDER BY (c.direction = 'want_from') DESC, c.at DESC, c.pid
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 6), 30));
$function$;
COMMENT ON FUNCTION public.get_goods_trade_candidates(uuid, integer) IS
  'グッズのページの「交換できるかも」。want_from=自分がほしい品を交換に出している人 / offer_to=自分が交換に出している品をほしい人。サンプルと実ユーザーは組ませない';
REVOKE ALL ON FUNCTION public.get_goods_trade_candidates(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_goods_trade_candidates(uuid, integer) TO authenticated;
