-- マイタグ（Personal Tags）テーブル作成
CREATE TABLE public.user_personal_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_item_id uuid NOT NULL REFERENCES public.user_items(id) ON DELETE CASCADE,
  tag_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_item_id, tag_name)
);

-- インデックス作成
CREATE INDEX idx_user_personal_tags_user_id ON public.user_personal_tags(user_id);
CREATE INDEX idx_user_personal_tags_user_item_id ON public.user_personal_tags(user_item_id);
CREATE INDEX idx_user_personal_tags_tag_name ON public.user_personal_tags(tag_name);

-- RLS有効化
ALTER TABLE public.user_personal_tags ENABLE ROW LEVEL SECURITY;

-- 自分のマイタグのみ操作可能
CREATE POLICY "Users can view their own personal tags"
  ON public.user_personal_tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own personal tags"
  ON public.user_personal_tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own personal tags"
  ON public.user_personal_tags FOR DELETE
  USING (auth.uid() = user_id);