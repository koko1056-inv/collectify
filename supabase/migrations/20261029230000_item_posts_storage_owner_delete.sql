-- 投稿を消したとき、その写真（item-posts バケット）も持ち主が消せるようにする。
--
-- これまで: item-posts バケットには持ち主の SELECT / DELETE のポリシーがなく
-- （一覧を見られないよう 20260514052501 で公開の SELECT を外した）、
-- アプリから storage.remove() してもエラーなしで 0 件になり、消した投稿の写真が公開 URL で見えたまま残っていた。
--
-- ここで: 自分のフォルダ（<自分の id>/<投稿の id>/n.jpg。アプリはこの形で上げる）の中だけ、
-- 見る（remove に必要）・消す ができるようにする。人のフォルダ・ほかのバケットは今までどおり触れない。
-- 写真の表示は公開 URL（getPublicUrl）なので、このポリシーとは関係なく今までどおり見える。

DROP POLICY IF EXISTS "item_posts_bucket_owner_select" ON storage.objects;
CREATE POLICY "item_posts_bucket_owner_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'item-posts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "item_posts_bucket_owner_delete" ON storage.objects;
CREATE POLICY "item_posts_bucket_owner_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'item-posts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
