-- 公式サンプルアカウント（運営のシミュレーターが動かすデモ用アカウント、profiles.is_sample）は
-- 実ユーザーとやり取りしない運用ルールを、データベース側でも強制する。
--
--  1. 交換の相手探し（マッチ・同じ作品の人・ほしいものを持っている人）の結果からサンプルを除く
--     （フロント側のボタン無効化と二重の安全策。一覧にそもそも出てこなくする）
--  2. create_trade_request に、相手がサンプルなら申し込めないチェックを足す
--  3. messages / trade_requests への INSERT を、受信者がサンプルかつ送信者が実ユーザーのときは
--     トリガーで拒否する（RPCを経由しない将来の経路や、直接INSERTが残っていた場合の保険）。
--     サンプル→サンプル、service_role（運営のシミュレーター本体）の動きは妨げない。

-- ---------------------------------------------------------------------------
-- 1. マッチ系RPCからサンプルアカウントを除く（列構成は変えないので DROP FUNCTION は不要）
-- ---------------------------------------------------------------------------

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
  WHERE NOT pr.is_sample
  ORDER BY (h.items IS NOT NULL AND t.items IS NOT NULL) DESC,
           public.trade_spotlight_user(p.pid) DESC,
           jsonb_array_length(COALESCE(h.items, '[]'::jsonb))
             + jsonb_array_length(COALESCE(t.items, '[]'::jsonb)) DESC,
           pr.username
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 30), 100));
$function$;
REVOKE ALL ON FUNCTION public.find_trade_matches(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_trade_matches(integer) TO authenticated;

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
    and not pr.is_sample
  order by x.spot desc, x.n desc, pr.username
  limit greatest(1, least(coalesce(_limit, 20), 50));
$function$;
revoke all on function public.find_trade_series_partners(integer) from public, anon;
grant execute on function public.find_trade_series_partners(integer) to authenticated;

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
      AND NOT pr.is_sample
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
REVOKE ALL ON FUNCTION public.find_holders_for_my_wishes(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_holders_for_my_wishes(integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. create_trade_request: 相手が公式サンプルアカウントなら申し込めない
--    （送信者自身がサンプル＝サンプル同士のやり取りは妨げない）
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_trade_request(
  _requested_item_id uuid,
  _offered_item_id uuid,
  _message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  req public.user_items;
  off public.user_items;
  prof_privacy text;
  t public.trade_requests;
BEGIN
  IF me IS NULL THEN
    RETURN public.trade_error('not_signed_in');
  END IF;

  SELECT * INTO req FROM public.user_items WHERE id = _requested_item_id;
  IF NOT FOUND THEN
    RETURN public.trade_error('item_not_found');
  END IF;

  SELECT * INTO off FROM public.user_items WHERE id = _offered_item_id AND user_id = me;
  IF NOT FOUND THEN
    RETURN public.trade_error('not_your_item');
  END IF;

  IF req.user_id = me THEN
    RETURN public.trade_error('self_trade');
  END IF;

  -- 公式サンプルアカウントは実ユーザーとやり取りしない（サンプル同士は妨げない）
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = req.user_id AND p.is_sample)
     AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = me AND p.is_sample)
  THEN
    RETURN public.trade_error('sample_account');
  END IF;

  -- どちらかがブロックしていれば申し込めない
  IF EXISTS (
    SELECT 1 FROM public.user_blocks b
    WHERE (b.blocker_id = me AND b.blocked_id = req.user_id)
       OR (b.blocker_id = req.user_id AND b.blocked_id = me)
  ) THEN
    RETURN public.trade_error('blocked');
  END IF;

  SELECT privacy_level::text INTO prof_privacy FROM public.profiles WHERE id = req.user_id;
  IF prof_privacy = 'private' THEN
    RETURN public.trade_error('private_profile');
  END IF;

  IF public.trade_item_in_progress(off.id) THEN
    RETURN public.trade_error('offered_committed');
  END IF;
  IF public.trade_item_in_progress(req.id) THEN
    RETURN public.trade_error('requested_committed');
  END IF;

  -- 同じ相手の同じ品へ、返事待ちの申請をもう出している
  IF EXISTS (
    SELECT 1 FROM public.trade_requests x
    WHERE x.sender_id = me AND x.requested_item_id = req.id AND x.status = 'pending'
  ) THEN
    RETURN public.trade_error('duplicate');
  END IF;

  -- 返事待ちを出しすぎない（出しっぱなしで相手の受信箱を埋めないため）
  IF (SELECT count(*) FROM public.trade_requests x WHERE x.sender_id = me AND x.status = 'pending') >= 20 THEN
    RETURN public.trade_error('too_many_pending');
  END IF;

  INSERT INTO public.trade_requests (
    sender_id, receiver_id, offered_item_id, requested_item_id, message, status, shipping_status,
    offered_title, offered_image, offered_official_item_id,
    requested_title, requested_image, requested_official_item_id
  ) VALUES (
    me, req.user_id, off.id, req.id, NULLIF(btrim(left(COALESCE(_message, ''), 500)), ''), 'pending', 'not_shipped',
    off.title, off.image, off.official_item_id,
    req.title, req.image, req.official_item_id
  )
  RETURNING * INTO t;

  RETURN public.trade_state_json(t);
END;
$$;

REVOKE ALL ON FUNCTION public.create_trade_request(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_trade_request(uuid, uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. messages / trade_requests への INSERT の保険（トリガー）
--    受信者がサンプルかつ送信者が実ユーザーのときだけ拒否する。
--    service_role（運営のシミュレーター本体）とサンプル→サンプルは通す。
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_not_messaging_sample()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _receiver_is_sample boolean;
  _sender_is_sample boolean;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT is_sample INTO _receiver_is_sample FROM public.profiles WHERE id = NEW.receiver_id;
  SELECT is_sample INTO _sender_is_sample FROM public.profiles WHERE id = NEW.sender_id;

  IF COALESCE(_receiver_is_sample, false) AND NOT COALESCE(_sender_is_sample, false) THEN
    RAISE EXCEPTION '公式サンプルアカウントとはやり取りできません' USING ERRCODE = 'P0001', HINT = 'SAMPLE_ACCOUNT';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_not_messaging_sample() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_not_messaging_sample ON public.messages;
CREATE TRIGGER trg_enforce_not_messaging_sample BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_not_messaging_sample();

DROP TRIGGER IF EXISTS trg_enforce_not_messaging_sample ON public.trade_requests;
CREATE TRIGGER trg_enforce_not_messaging_sample BEFORE INSERT ON public.trade_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_not_messaging_sample();
