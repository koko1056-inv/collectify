-- バインダーページを管理するテーブル
CREATE TABLE public.binder_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'マイバインダー',
  background_image TEXT,
  background_color TEXT DEFAULT '#ffffff',
  page_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- バインダー内のアイテム配置情報を管理するテーブル
CREATE TABLE public.binder_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  binder_page_id UUID NOT NULL REFERENCES public.binder_pages(id) ON DELETE CASCADE,
  user_item_id UUID REFERENCES public.user_items(id) ON DELETE CASCADE,
  official_item_id UUID REFERENCES public.official_items(id) ON DELETE CASCADE,
  custom_image_url TEXT,
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  width FLOAT NOT NULL DEFAULT 100,
  height FLOAT NOT NULL DEFAULT 140,
  rotation FLOAT NOT NULL DEFAULT 0,
  z_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT item_source_check CHECK (
    (user_item_id IS NOT NULL AND official_item_id IS NULL AND custom_image_url IS NULL) OR
    (user_item_id IS NULL AND official_item_id IS NOT NULL AND custom_image_url IS NULL) OR
    (user_item_id IS NULL AND official_item_id IS NULL AND custom_image_url IS NOT NULL)
  )
);

-- デコレーション要素を管理するテーブル
CREATE TABLE public.binder_decorations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  binder_page_id UUID NOT NULL REFERENCES public.binder_pages(id) ON DELETE CASCADE,
  decoration_type TEXT NOT NULL, -- 'sticker', 'frame', 'text'
  content TEXT, -- テキストまたはステッカーのURL/ID
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  width FLOAT,
  height FLOAT,
  rotation FLOAT NOT NULL DEFAULT 0,
  z_index INTEGER NOT NULL DEFAULT 0,
  style_config JSONB, -- 色、フォント、枠線などのスタイル設定
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLSポリシー: binder_pages
ALTER TABLE public.binder_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own binder pages"
  ON public.binder_pages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own binder pages"
  ON public.binder_pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own binder pages"
  ON public.binder_pages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own binder pages"
  ON public.binder_pages FOR DELETE
  USING (auth.uid() = user_id);

-- RLSポリシー: binder_items
ALTER TABLE public.binder_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items on their own binder pages"
  ON public.binder_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.binder_pages
    WHERE binder_pages.id = binder_items.binder_page_id
    AND binder_pages.user_id = auth.uid()
  ));

CREATE POLICY "Users can add items to their own binder pages"
  ON public.binder_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.binder_pages
    WHERE binder_pages.id = binder_items.binder_page_id
    AND binder_pages.user_id = auth.uid()
  ));

CREATE POLICY "Users can update items on their own binder pages"
  ON public.binder_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.binder_pages
    WHERE binder_pages.id = binder_items.binder_page_id
    AND binder_pages.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete items from their own binder pages"
  ON public.binder_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.binder_pages
    WHERE binder_pages.id = binder_items.binder_page_id
    AND binder_pages.user_id = auth.uid()
  ));

-- RLSポリシー: binder_decorations
ALTER TABLE public.binder_decorations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view decorations on their own binder pages"
  ON public.binder_decorations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.binder_pages
    WHERE binder_pages.id = binder_decorations.binder_page_id
    AND binder_pages.user_id = auth.uid()
  ));

CREATE POLICY "Users can add decorations to their own binder pages"
  ON public.binder_decorations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.binder_pages
    WHERE binder_pages.id = binder_decorations.binder_page_id
    AND binder_pages.user_id = auth.uid()
  ));

CREATE POLICY "Users can update decorations on their own binder pages"
  ON public.binder_decorations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.binder_pages
    WHERE binder_pages.id = binder_decorations.binder_page_id
    AND binder_pages.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete decorations from their own binder pages"
  ON public.binder_decorations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.binder_pages
    WHERE binder_pages.id = binder_decorations.binder_page_id
    AND binder_pages.user_id = auth.uid()
  ));

-- インデックスの作成
CREATE INDEX idx_binder_pages_user_id ON public.binder_pages(user_id);
CREATE INDEX idx_binder_pages_order ON public.binder_pages(user_id, page_order);
CREATE INDEX idx_binder_items_page_id ON public.binder_items(binder_page_id);
CREATE INDEX idx_binder_decorations_page_id ON public.binder_decorations(binder_page_id);