-- 展示場ギャラリー用のテーブルを作成
CREATE TABLE IF NOT EXISTS public.display_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  background_preset_id UUID REFERENCES background_presets(id) ON DELETE SET NULL,
  item_ids UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- RLSポリシーを有効化
ALTER TABLE public.display_gallery ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の展示場ギャラリーを閲覧可能
CREATE POLICY "Users can view their own display gallery"
  ON public.display_gallery
  FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーは自分の展示場ギャラリーを作成可能
CREATE POLICY "Users can create their own display gallery"
  ON public.display_gallery
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の展示場ギャラリーを削除可能
CREATE POLICY "Users can delete their own display gallery"
  ON public.display_gallery
  FOR DELETE
  USING (auth.uid() = user_id);

-- インデックスを作成してパフォーマンスを向上
CREATE INDEX idx_display_gallery_user_id ON public.display_gallery(user_id);
CREATE INDEX idx_display_gallery_created_at ON public.display_gallery(created_at DESC);