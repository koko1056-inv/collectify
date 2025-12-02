-- binder_pagesテーブルに「メインルーム」フラグを追加
ALTER TABLE public.binder_pages 
ADD COLUMN IF NOT EXISTS is_main_room BOOLEAN DEFAULT false;

-- 各ユーザーにつき1つだけメインルームを許可するユニーク制約（部分インデックス）
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_main_room_per_user 
ON public.binder_pages (user_id) 
WHERE is_main_room = true;

-- binder_pagesテーブルに公開設定と訪問数を追加
ALTER TABLE public.binder_pages 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0;

-- 部屋訪問履歴テーブル
CREATE TABLE IF NOT EXISTS public.room_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.binder_pages(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visit_date DATE DEFAULT CURRENT_DATE,
  visited_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, visitor_id, visit_date)
);

-- 部屋いいねテーブル
CREATE TABLE IF NOT EXISTS public.room_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.binder_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- RLS有効化
ALTER TABLE public.room_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_likes ENABLE ROW LEVEL SECURITY;

-- room_visits RLSポリシー
CREATE POLICY "Anyone can view room visits" ON public.room_visits
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create room visits" ON public.room_visits
  FOR INSERT WITH CHECK (auth.uid() = visitor_id);

-- room_likes RLSポリシー
CREATE POLICY "Anyone can view room likes" ON public.room_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own room likes" ON public.room_likes
  FOR ALL USING (auth.uid() = user_id);

-- 訪問数を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION public.increment_room_visit_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.binder_pages
  SET visit_count = visit_count + 1
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- トリガー作成
DROP TRIGGER IF EXISTS on_room_visit ON public.room_visits;
CREATE TRIGGER on_room_visit
  AFTER INSERT ON public.room_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_room_visit_count();