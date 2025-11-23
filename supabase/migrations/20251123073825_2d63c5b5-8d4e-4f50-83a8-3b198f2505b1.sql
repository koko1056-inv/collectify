-- 投稿とアイテムの多対多関係を管理するテーブルを作成
CREATE TABLE IF NOT EXISTS public.post_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.goods_posts(id) ON DELETE CASCADE,
  user_item_id UUID NOT NULL REFERENCES public.user_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_item_id)
);

-- RLSを有効化
ALTER TABLE public.post_items ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能
CREATE POLICY "post_items are viewable by everyone"
  ON public.post_items
  FOR SELECT
  USING (true);

-- 投稿作成者のみ追加可能
CREATE POLICY "Users can insert their own post_items"
  ON public.post_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goods_posts
      WHERE id = post_id AND user_id = auth.uid()
    )
  );

-- 投稿作成者のみ削除可能
CREATE POLICY "Users can delete their own post_items"
  ON public.post_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.goods_posts
      WHERE id = post_id AND user_id = auth.uid()
    )
  );

-- インデックスを追加してパフォーマンスを向上
CREATE INDEX IF NOT EXISTS idx_post_items_post_id ON public.post_items(post_id);
CREATE INDEX IF NOT EXISTS idx_post_items_user_item_id ON public.post_items(user_item_id);