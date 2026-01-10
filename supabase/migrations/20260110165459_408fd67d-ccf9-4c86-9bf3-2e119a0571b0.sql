-- チャレンジにグッズ（official_item）を紐づけるためのカラムを追加
ALTER TABLE public.challenges 
ADD COLUMN official_item_id UUID REFERENCES public.official_items(id);

-- インデックスを追加
CREATE INDEX idx_challenges_official_item_id ON public.challenges(official_item_id);