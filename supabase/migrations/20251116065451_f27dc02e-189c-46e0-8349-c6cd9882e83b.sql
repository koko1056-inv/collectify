-- goods_postsテーブルのSELECTポリシーを修正
DROP POLICY IF EXISTS "Users can view posts based on privacy settings" ON goods_posts;

-- すべての認証済みユーザーが投稿を閲覧できるようにする
CREATE POLICY "Anyone can view posts"
ON goods_posts
FOR SELECT
TO public
USING (true);

-- post_likesテーブルのポリシーも確認・修正
DROP POLICY IF EXISTS "Users can view their own likes" ON post_likes;
DROP POLICY IF EXISTS "Users can view all likes" ON post_likes;

CREATE POLICY "Anyone can view all likes"
ON post_likes
FOR SELECT
TO public
USING (true);

-- post_commentsテーブルのポリシーも確認
DROP POLICY IF EXISTS "Users can view comments based on post privacy" ON post_comments;

CREATE POLICY "Anyone can view all comments"
ON post_comments
FOR SELECT
TO public
USING (true);