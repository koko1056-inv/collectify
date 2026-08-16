-- 交換（トレード）の土台をそろえる
--
-- いまの交換機能には、噛み合っていない部分が3つある。
--
-- 1. 「欲しい」の置き場所が2つある
--    検索カードの左スワイプは user_items に quantity=0 で書き込んでいて、
--    ウィッシュリストのつもりだった。しかしコレクション一覧は quantity を
--    見ずに全部並べるので、欲しいだけのグッズが持ち物として表示される。
--    さらにマッチングは wishlists しか読まないので、この「欲しい」は
--    マッチングから完全に見えていない。
--
-- 2. 譲れるかどうかの意思表示がない
--    マッチングは相手の user_items を全部なめるので、1つしかない大事な
--    グッズにも交換を申し込まれてしまう。
--
-- 3. マッチングがクライアント側にある
--    最大5000行を引いてブラウザで突き合わせている。件数が増えると破綻するし、
--    「相手も自分のものを欲しがっているか」を確かめられていない。
--
-- このマイグレーションで 1 と 2 のデータをそろえ、3 の突き合わせを
-- サーバー側の関数に移す。

-- ---------------------------------------------------------------------------
-- 1. ウィッシュの表現を wishlists にひとつにまとめる
-- ---------------------------------------------------------------------------

-- 同じグッズが二重に入っている行を先に落とす。
-- 残すのは一番古い1行（最初に欲しいと言った時刻を保つ）。
DELETE FROM public.wishlists w
USING public.wishlists keep
WHERE w.official_item_id IS NOT NULL
  AND keep.official_item_id = w.official_item_id
  AND keep.user_id = w.user_id
  AND (keep.created_at, keep.id) < (w.created_at, w.id);

DELETE FROM public.wishlists w
USING public.wishlists keep
WHERE w.original_item_id IS NOT NULL
  AND keep.original_item_id = w.original_item_id
  AND keep.user_id = w.user_id
  AND (keep.created_at, keep.id) < (w.created_at, w.id);

-- 以後の重複を防ぐ。ON CONFLICT DO NOTHING を使うためにも必要。
CREATE UNIQUE INDEX IF NOT EXISTS wishlists_user_official_item_key
  ON public.wishlists (user_id, official_item_id)
  WHERE official_item_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS wishlists_user_original_item_key
  ON public.wishlists (user_id, original_item_id)
  WHERE original_item_id IS NOT NULL;

-- quantity=0 の「持ち物のふりをしたウィッシュ」を wishlists に移す。
-- 既に wishlists 側にある場合は何もしない。
INSERT INTO public.wishlists (user_id, official_item_id, original_item_id, created_at)
SELECT DISTINCT ON (ui.user_id, ui.official_item_id)
       ui.user_id, ui.official_item_id, NULL::uuid, ui.created_at
FROM public.user_items ui
WHERE ui.quantity = 0
  AND ui.official_item_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.trade_requests tr
    WHERE tr.offered_item_id = ui.id OR tr.requested_item_id = ui.id
  )
ORDER BY ui.user_id, ui.official_item_id, ui.created_at
ON CONFLICT DO NOTHING;

INSERT INTO public.wishlists (user_id, official_item_id, original_item_id, created_at)
SELECT DISTINCT ON (ui.user_id, ui.original_item_id)
       ui.user_id, NULL::uuid, ui.original_item_id, ui.created_at
FROM public.user_items ui
WHERE ui.quantity = 0
  AND ui.official_item_id IS NULL
  AND ui.original_item_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.trade_requests tr
    WHERE tr.offered_item_id = ui.id OR tr.requested_item_id = ui.id
  )
ORDER BY ui.user_id, ui.original_item_id, ui.created_at
ON CONFLICT DO NOTHING;

-- 移し終えた行をコレクションから外す。
-- 交換のやり取りから参照されている行は履歴が消えるので、移送も削除もしない
-- （quantity=0 のまま交換に出ている状態は本来ありえないが、念のため）。
DELETE FROM public.user_items ui
WHERE ui.quantity = 0
  AND (ui.official_item_id IS NOT NULL OR ui.original_item_id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM public.trade_requests tr
    WHERE tr.offered_item_id = ui.id OR tr.requested_item_id = ui.id
  );

-- ---------------------------------------------------------------------------
-- 2. 「これは譲れる」の意思表示
-- ---------------------------------------------------------------------------

-- 既定は false。個数が2つ以上になっても勝手に true にはしない。
-- 手放していいかどうかは本人にしか決められないため、UI で必ず確認する。
ALTER TABLE public.user_items
  ADD COLUMN IF NOT EXISTS for_trade boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_items.for_trade IS
  '交換に出してよいグッズかどうか。本人が明示的に有効にしたときだけ true。';

-- マッチングは「交換に出ているもの」だけを見る
CREATE INDEX IF NOT EXISTS idx_user_items_for_trade_official
  ON public.user_items (official_item_id)
  WHERE for_trade AND official_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_items_for_trade_original
  ON public.user_items (original_item_id)
  WHERE for_trade AND original_item_id IS NOT NULL;

-- 相手のウィッシュを引く側の索引
CREATE INDEX IF NOT EXISTS idx_wishlists_official_item_id
  ON public.wishlists (official_item_id)
  WHERE official_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wishlists_original_item_id
  ON public.wishlists (original_item_id)
  WHERE original_item_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. マッチングをサーバー側へ
-- ---------------------------------------------------------------------------

-- 「両想い」= 相手が交換に出しているものを自分が欲しがっていて、
--            かつ自分が交換に出しているものを相手が欲しがっている。
--
-- 片想い（どちらか一方だけ）も返すが、is_mutual で区別できるようにして
-- 呼び出し側が並び順を決められるようにする。
--
-- SECURITY DEFINER なのは、他人の user_items / wishlists を突き合わせる必要が
-- あるため。対象は auth.uid() に固定していて、引数で他人になりすませない。
CREATE OR REPLACE FUNCTION public.find_trade_matches(_limit integer DEFAULT 30)
RETURNS TABLE (
  partner_id uuid,
  partner_username text,
  partner_avatar_url text,
  is_mutual boolean,
  their_items jsonb,
  my_items jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- 相手が交換に出していて、自分が欲しいもの
  they_have AS (
    SELECT DISTINCT ui.user_id AS pid, ui.id, ui.title, ui.image
    FROM public.user_items ui
    JOIN my_wish w
      ON (w.official_item_id IS NOT NULL AND w.official_item_id = ui.official_item_id)
      OR (w.original_item_id IS NOT NULL AND w.original_item_id = ui.original_item_id)
    WHERE ui.user_id <> auth.uid()
      AND ui.for_trade
  ),
  -- 自分が交換に出していて、相手が欲しいもの
  they_want AS (
    SELECT DISTINCT w.user_id AS pid, m.id, m.title, m.image
    FROM public.wishlists w
    JOIN my_offer m
      ON (w.official_item_id IS NOT NULL AND w.official_item_id = m.official_item_id)
      OR (w.original_item_id IS NOT NULL AND w.original_item_id = m.original_item_id)
    WHERE w.user_id <> auth.uid()
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
    SELECT jsonb_agg(jsonb_build_object('id', x.id, 'title', x.title, 'image', x.image)) AS items
    FROM (SELECT h2.id, h2.title, h2.image FROM they_have h2 WHERE h2.pid = p.pid LIMIT 8) x
  ) h ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object('id', y.id, 'title', y.title, 'image', y.image)) AS items
    FROM (SELECT t2.id, t2.title, t2.image FROM they_want t2 WHERE t2.pid = p.pid LIMIT 8) y
  ) t ON true
  ORDER BY 4 DESC,
           jsonb_array_length(COALESCE(h.items, '[]'::jsonb))
             + jsonb_array_length(COALESCE(t.items, '[]'::jsonb)) DESC,
           pr.username
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 30), 100));
$$;

COMMENT ON FUNCTION public.find_trade_matches(integer) IS
  '交換相手の候補を返す。is_mutual=true が「両想い」。対象は常に auth.uid()。';

REVOKE ALL ON FUNCTION public.find_trade_matches(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_trade_matches(integer) TO authenticated;