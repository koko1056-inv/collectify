-- 同担マッチング計算用の関数群を追加
-- find_user_matches: 自分と他ユーザーの「興味」「所有グッズ」「交換可能数」を集計してマッチ候補を返す

CREATE OR REPLACE FUNCTION public.find_user_matches(_user_id uuid, _limit int DEFAULT 30)
RETURNS TABLE (
  candidate_id uuid,
  shared_interests int,
  shared_items int,
  tradeable_items int,
  score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me_interests AS (
    SELECT unnest(COALESCE(interests, ARRAY[]::text[])) AS tag
    FROM profiles WHERE id = _user_id
  ),
  me_items AS (
    SELECT DISTINCT official_item_id AS item_id
    FROM user_items
    WHERE user_id = _user_id AND official_item_id IS NOT NULL
  ),
  me_wishes AS (
    SELECT DISTINCT official_item_id AS item_id
    FROM wishlists
    WHERE user_id = _user_id AND official_item_id IS NOT NULL
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
    AND (shared_interests + shared_items + tradeable_items) > 0
  ORDER BY score DESC
  LIMIT _limit;
$$;

-- collection_diff: 2人のコレクション差分（共通/相手だけ持ってる/自分だけ持ってる/お互いの欲しい）
CREATE OR REPLACE FUNCTION public.get_collection_diff(_me uuid, _other uuid)
RETURNS TABLE (
  official_item_id uuid,
  diff_type text  -- 'common' | 'they_have_i_want' | 'i_have_they_want' | 'they_only' | 'i_only'
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_items AS (
    SELECT DISTINCT official_item_id AS item_id FROM user_items
    WHERE user_id = _me AND official_item_id IS NOT NULL
  ),
  their_items AS (
    SELECT DISTINCT official_item_id AS item_id FROM user_items
    WHERE user_id = _other AND official_item_id IS NOT NULL
  ),
  my_wishes AS (
    SELECT DISTINCT official_item_id AS item_id FROM wishlists
    WHERE user_id = _me AND official_item_id IS NOT NULL
  ),
  their_wishes AS (
    SELECT DISTINCT official_item_id AS item_id FROM wishlists
    WHERE user_id = _other AND official_item_id IS NOT NULL
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
$$;