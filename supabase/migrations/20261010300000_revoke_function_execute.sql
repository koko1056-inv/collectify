-- 公開前の監査（2026-10-10）: 匿名・ログイン済みユーザーが直接呼べる関数を絞る。
-- 呼び出すのはクライアントの rpc() と、RLS ポリシーで評価される関数だけに限る。

-- 1) トリガー関数は、トリガーが呼ぶだけ。誰にも直接の実行権限はいらない。
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- 2) ログイン前に呼ぶ必要がない関数は、匿名（anon）から外す
REVOKE ALL ON FUNCTION public.cancel_trade_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.report_trade_receipt(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.report_trade_shipment(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.merge_official_items(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_duplicate_official_items(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_similar_official_items(text, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_trade_matches(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_trade_series_partners(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_user_matches(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_collection_diff(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_current_avatar(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_or_create_item_room(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.image_signature(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._holo2(boolean) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.cancel_trade_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_trade_receipt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_trade_shipment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_official_items(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_duplicate_official_items(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_similar_official_items(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_trade_matches(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_trade_series_partners(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_matches(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_collection_diff(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_current_avatar(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_item_room(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.image_signature(text) TO authenticated;

-- 3) 引数で渡されたユーザーを信用しない。呼んだ本人の視点でしか計算しない。
CREATE OR REPLACE FUNCTION public.find_user_matches(_user_id uuid, _limit integer DEFAULT 30)
 RETURNS TABLE(candidate_id uuid, shared_interests integer, shared_items integer, tradeable_items integer, score numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH me_interests AS (
    SELECT unnest(COALESCE(interests, ARRAY[]::text[])) AS tag
    FROM profiles WHERE id = _user_id AND _user_id = auth.uid()
  ),
  me_items AS (
    SELECT DISTINCT official_item_id AS item_id
    FROM user_items
    WHERE user_id = _user_id AND _user_id = auth.uid() AND official_item_id IS NOT NULL
  ),
  me_wishes AS (
    SELECT DISTINCT official_item_id AS item_id
    FROM wishlists
    WHERE user_id = _user_id AND _user_id = auth.uid() AND official_item_id IS NOT NULL
  ),
  candidate_interests AS (
    SELECT p.id AS candidate_id, COUNT(*)::int AS shared_interests
    FROM profiles p
    CROSS JOIN LATERAL unnest(COALESCE(p.interests, ARRAY[]::text[])) AS t(tag)
    JOIN me_interests mi ON mi.tag = t.tag
    WHERE p.id <> _user_id
    GROUP BY p.id
  ),
  candidate_items AS (
    SELECT ui.user_id AS candidate_id, COUNT(DISTINCT ui.official_item_id)::int AS shared_items
    FROM user_items ui
    JOIN me_items mi ON mi.item_id = ui.official_item_id
    WHERE ui.user_id <> _user_id AND ui.official_item_id IS NOT NULL
    GROUP BY ui.user_id
  ),
  -- 交換可能：相手が持っていて自分が欲しい + 自分が持っていて相手が欲しい
  candidate_tradeable AS (
    SELECT candidate_id, COUNT(DISTINCT item_id)::int AS tradeable_items FROM (
      SELECT ui.user_id AS candidate_id, ui.official_item_id AS item_id
      FROM user_items ui
      JOIN me_wishes mw ON mw.item_id = ui.official_item_id
      WHERE ui.user_id <> _user_id AND ui.official_item_id IS NOT NULL
      UNION
      SELECT w.user_id AS candidate_id, w.official_item_id AS item_id
      FROM wishlists w
      JOIN me_items mi ON mi.item_id = w.official_item_id
      WHERE w.user_id <> _user_id AND w.official_item_id IS NOT NULL
    ) t GROUP BY candidate_id
  ),
  combined AS (
    SELECT
      COALESCE(ci.candidate_id, citems.candidate_id, ct.candidate_id) AS candidate_id,
      COALESCE(ci.shared_interests, 0) AS shared_interests,
      COALESCE(citems.shared_items, 0) AS shared_items,
      COALESCE(ct.tradeable_items, 0) AS tradeable_items
    FROM candidate_interests ci
    FULL OUTER JOIN candidate_items citems ON citems.candidate_id = ci.candidate_id
    FULL OUTER JOIN candidate_tradeable ct ON ct.candidate_id = COALESCE(ci.candidate_id, citems.candidate_id)
  )
  SELECT
    candidate_id,
    shared_interests,
    shared_items,
    tradeable_items,
    (shared_interests * 2 + shared_items * 3 + tradeable_items * 5)::numeric AS score
  FROM combined
  WHERE candidate_id IS NOT NULL
    AND _user_id = auth.uid()
    AND (shared_interests + shared_items + tradeable_items) > 0
  ORDER BY score DESC
  LIMIT _limit;
$function$;

CREATE OR REPLACE FUNCTION public.get_collection_diff(_me uuid, _other uuid)
 RETURNS TABLE(official_item_id uuid, diff_type text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH my_items AS (
    SELECT DISTINCT official_item_id AS item_id FROM user_items
    WHERE user_id = _me AND _me = auth.uid() AND official_item_id IS NOT NULL
  ),
  their_items AS (
    SELECT DISTINCT official_item_id AS item_id FROM user_items
    WHERE user_id = _other AND _me = auth.uid() AND official_item_id IS NOT NULL
  ),
  my_wishes AS (
    SELECT DISTINCT official_item_id AS item_id FROM wishlists
    WHERE user_id = _me AND _me = auth.uid() AND official_item_id IS NOT NULL
  ),
  their_wishes AS (
    SELECT DISTINCT official_item_id AS item_id FROM wishlists
    WHERE user_id = _other AND _me = auth.uid() AND official_item_id IS NOT NULL
  )
  SELECT item_id, 'common'::text FROM my_items WHERE item_id IN (SELECT item_id FROM their_items)
  UNION ALL
  SELECT item_id, 'they_have_i_want'::text FROM their_items
    WHERE item_id IN (SELECT item_id FROM my_wishes)
      AND item_id NOT IN (SELECT item_id FROM my_items)
  UNION ALL
  SELECT item_id, 'i_have_they_want'::text FROM my_items
    WHERE item_id IN (SELECT item_id FROM their_wishes)
      AND item_id NOT IN (SELECT item_id FROM their_items)
  UNION ALL
  SELECT item_id, 'they_only'::text FROM their_items
    WHERE item_id NOT IN (SELECT item_id FROM my_items)
      AND item_id NOT IN (SELECT item_id FROM my_wishes)
  UNION ALL
  SELECT item_id, 'i_only'::text FROM my_items
    WHERE item_id NOT IN (SELECT item_id FROM their_items)
      AND item_id NOT IN (SELECT item_id FROM their_wishes);
$function$;

-- 4) search_path が固定されていない関数に固定する
ALTER FUNCTION public.trade_error(text) SET search_path = public;
ALTER FUNCTION public.trade_state_json(public.trade_requests) SET search_path = public;
ALTER FUNCTION public.normalize_item_title(text) SET search_path = public;

-- 5) 画像バケットにサイズ上限（10MB）と許可する形式を設定する
UPDATE storage.buckets
   SET file_size_limit = 10485760,
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','image/avif']
 WHERE id IN ('ai-rooms','item-posts','kuji_images','profile_images');
