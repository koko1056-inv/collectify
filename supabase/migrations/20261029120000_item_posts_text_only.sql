-- 文字だけの投稿（X のように、写真なし・グッズなしでも書ける）を許す。
--
-- 写真は item_post_images の別の表にあるので、写真なしの投稿はもともと入れられる。
-- 止めていたのは item_posts_target_check（公式グッズか持ち物のどちらかが必須）だけ。
-- グッズを付けない投稿は、本文が空でないときだけ許す（空の投稿は今までどおり入らない）。
--
-- いまある行は「グッズあり」を満たしているので、新しい制約も満たす（検証で落ちない）。
-- ポイント（award_points_on_item_post、1日3回まで）・通報・非表示・RLS は item_posts の行に付くので、そのまま使える。

ALTER TABLE public.item_posts DROP CONSTRAINT IF EXISTS item_posts_target_check;
ALTER TABLE public.item_posts
  ADD CONSTRAINT item_posts_target_check
  CHECK (
    official_item_id IS NOT NULL
    OR user_item_id IS NOT NULL
    OR char_length(btrim(coalesce(caption, ''))) > 0
  );
