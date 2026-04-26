
-- リミックス機能: 親作品の参照を ai_generated_rooms に追加
ALTER TABLE public.ai_generated_rooms
  ADD COLUMN IF NOT EXISTS parent_room_id UUID REFERENCES public.ai_generated_rooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_generated_rooms_parent
  ON public.ai_generated_rooms(parent_room_id);

-- AI作品のブックマーク（ルーム / アバターを横断して保存）
CREATE TABLE IF NOT EXISTS public.ai_work_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  work_id UUID NOT NULL,
  work_type TEXT NOT NULL CHECK (work_type IN ('room', 'avatar')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, work_id, work_type)
);

CREATE INDEX IF NOT EXISTS idx_ai_work_bookmarks_user
  ON public.ai_work_bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_work_bookmarks_work
  ON public.ai_work_bookmarks(work_id, work_type);

ALTER TABLE public.ai_work_bookmarks ENABLE ROW LEVEL SECURITY;

-- 自分のブックマークは自由に閲覧
CREATE POLICY "Users can view own bookmarks"
  ON public.ai_work_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

-- 自分のブックマークを追加
CREATE POLICY "Users can insert own bookmarks"
  ON public.ai_work_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 自分のブックマークを削除
CREATE POLICY "Users can delete own bookmarks"
  ON public.ai_work_bookmarks FOR DELETE
  USING (auth.uid() = user_id);
