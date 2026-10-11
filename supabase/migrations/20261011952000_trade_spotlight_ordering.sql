-- 交換の「注目」: 一覧の並びで、注目中の相手・品を先に出す。
-- 返す列は変えない（CREATE OR REPLACE のまま差し替えられ、古いアプリもそのまま動く）。
-- 「注目」の印は get_trade_spotlight_users で引く。

-- 6) ほしいものを持っている人: 注目中の人（交換に出していて、別の交換で埋まっていない）を各グッズの先頭に
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
           pr.username, pr.display_name, pr.avatar_url,
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

-- 7) マッチ: 両想いが先なのは変えず、その中・片想いの中で注目中の相手を先に。
-- 返す列は変えない（印は get_trade_spotlight_users で引く）。古いアプリもそのまま動く。
CREATE OR REPLACE FUNCTION public.find_trade_matches(_limit integer DEFAULT 30)
 RETURNS TABLE(partner_id uuid, partner_username text, partner_avatar_url text, is_mutual boolean, their_items jsonb, my_items jsonb)
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
  ORDER BY 4 DESC,
           public.trade_spotlight_user(p.pid) DESC,
           jsonb_array_length(COALESCE(h.items, '[]'::jsonb))
             + jsonb_array_length(COALESCE(t.items, '[]'::jsonb)) DESC,
           pr.username
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 30), 100));
$function$;

-- 8) 同じ作品を集めている人: 注目中の相手を先に
CREATE OR REPLACE FUNCTION public.find_trade_series_partners(_limit integer DEFAULT 20)
 RETURNS TABLE(partner_id uuid, partner_username text, partner_avatar_url text, shared_series text[], their_items jsonb)
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

-- 9) 相手が交換に出している品: 相手ごとの並びで、注目中の品を先に（24件で切るので）
CREATE OR REPLACE FUNCTION public.get_trade_partner_items(_partner_ids uuid[], _only_for_trade boolean DEFAULT true)
 RETURNS TABLE(partner_id uuid, item_id uuid, title text, image text, for_trade boolean, already_requested boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH hidden AS (
    SELECT b.blocked_id AS uid FROM public.user_blocks b WHERE b.blocker_id = auth.uid()
    UNION
    SELECT b.blocker_id AS uid FROM public.user_blocks b WHERE b.blocked_id = auth.uid()
  ),
  ids AS (
    -- 一度に見る相手は30人まで（交換タブの片想いの件数に合わせる）
    SELECT DISTINCT x AS pid
    FROM unnest(COALESCE(_partner_ids, '{}'::uuid[])) AS x
    LIMIT CASE WHEN COALESCE(_only_for_trade, true) THEN 30 ELSE 1 END
  )
  SELECT
    p.pid,
    it.id,
    it.title,
    it.image,
    it.for_trade,
    EXISTS (
      SELECT 1 FROM public.trade_requests tr
      WHERE tr.sender_id = auth.uid() AND tr.requested_item_id = it.id
        AND tr.status IN ('pending', 'accepted')
    )
  FROM ids p
  JOIN public.profiles pr ON pr.id = p.pid
  CROSS JOIN LATERAL (
    SELECT ui.id, ui.title, ui.image, ui.for_trade,
           (ui.for_trade AND public.trade_spotlight_covers(ui.user_id, ui.id)) AS spot,
           ui.created_at
    FROM public.user_items ui
    WHERE ui.user_id = p.pid
      AND (ui.for_trade OR NOT COALESCE(_only_for_trade, true))
      AND NOT public.trade_item_in_progress(ui.id)
    ORDER BY ui.for_trade DESC, 5 DESC, ui.created_at DESC
    LIMIT CASE WHEN COALESCE(_only_for_trade, true) THEN 24 ELSE 200 END
  ) it
  WHERE auth.uid() IS NOT NULL
    AND p.pid <> auth.uid()
    AND p.pid NOT IN (SELECT h.uid FROM hidden h)
    AND (
      COALESCE(_only_for_trade, true)
      OR pr.privacy_level::text = 'public'
      OR (pr.privacy_level::text = 'followers' AND EXISTS (
            SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = pr.id))
    )
  ORDER BY p.pid, it.for_trade DESC, it.spot DESC, it.created_at DESC;
$function$;
