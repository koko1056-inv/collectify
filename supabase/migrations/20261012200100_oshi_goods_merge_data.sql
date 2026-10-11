-- 「お気に入りTOP5」と「相棒グッズ」を「推しグッズ」にまとめたときの、今あるデータの引っ越し。
-- 仕組みは 20261012200000_oshi_goods_unify.sql を参照。
--
-- 新しい推しグッズ = 今のお気に入りの順番 + まだ入っていない相棒（迎えた順）を後ろに足したもの。5つまで。
-- 5つを超えるときは、なかよし度（xp）が 0 より大きいものを優先して残す（育てた分が見えなくならないように）。
-- 残すものの並びは、上の「お気に入り → 相棒」の順のまま。
-- 外れたものも companion_goods の行は消さない（また選べば、なかよし度が戻る）。
--
-- 適用時点の対象は1人（お気に入り5つ・相棒3つ、重なりなし、相棒はどれも xp > 0）。
-- このため、相棒3つ + お気に入りの1位・2位が残り、お気に入りの3〜5位が外れる。

WITH cand AS (
  SELECT p.id AS uid, f.id AS item, f.ord AS pos
  FROM public.profiles p
  CROSS JOIN LATERAL unnest(p.favorite_item_ids) WITH ORDINALITY AS f(id, ord)
  UNION ALL
  SELECT cg.user_id, cg.user_item_id,
         1000 + row_number() OVER (PARTITION BY cg.user_id ORDER BY cg.created_at, cg.user_item_id)
  FROM public.companion_goods cg
), owned AS (
  SELECT DISTINCT ON (c.uid, c.item) c.uid, c.item, c.pos, coalesce(cg.xp, 0) AS xp
  FROM cand c
  JOIN public.user_items u ON u.id = c.item AND u.user_id = c.uid
  LEFT JOIN public.companion_goods cg ON cg.user_id = c.uid AND cg.user_item_id = c.item
  ORDER BY c.uid, c.item, c.pos
), ranked AS (
  SELECT uid, item, pos, row_number() OVER (PARTITION BY uid ORDER BY (xp > 0) DESC, pos) AS keep_rank
  FROM owned
), merged AS (
  SELECT uid, array_agg(item ORDER BY pos) AS ids
  FROM ranked
  WHERE keep_rank <= 5
  GROUP BY uid
)
UPDATE public.profiles p
   SET favorite_item_ids = m.ids
  FROM merged m
 WHERE p.id = m.uid
   AND p.favorite_item_ids IS DISTINCT FROM m.ids;

-- ポイント履歴に出る説明も「推しグッズ」に
UPDATE public.point_rewards SET description = '推しグッズがレベル5' WHERE reason = 'companion_lv5';
UPDATE public.point_rewards SET description = '推しグッズがレベル10' WHERE reason = 'companion_lv10';
