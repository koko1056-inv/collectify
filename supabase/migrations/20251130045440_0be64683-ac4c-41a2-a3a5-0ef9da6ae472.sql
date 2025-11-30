-- バインダーページにタイプを追加
ALTER TABLE public.binder_pages 
ADD COLUMN binder_type TEXT NOT NULL DEFAULT 'free_layout';

-- バインダーページにメタデータを追加（カードポケット型の設定など）
ALTER TABLE public.binder_pages 
ADD COLUMN layout_config JSONB DEFAULT '{}'::jsonb;

-- コメント追加
COMMENT ON COLUMN public.binder_pages.binder_type IS 'free_layout: 自由配置, card_pocket: カードポケット型';
COMMENT ON COLUMN public.binder_pages.layout_config IS 'レイアウト固有の設定（ポケット数、グリッドサイズなど）';

-- ステッカープリセットテーブル
CREATE TABLE public.sticker_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'emoji', 'shape', 'decoration'
  image_url TEXT,
  svg_data TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for sticker_presets
ALTER TABLE public.sticker_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public stickers"
  ON public.sticker_presets FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create their own stickers"
  ON public.sticker_presets FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- フレームプリセットテーブル
CREATE TABLE public.frame_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'simple', 'decorative', 'polaroid'
  border_style TEXT NOT NULL, -- CSS border style
  corner_radius INTEGER DEFAULT 0,
  padding INTEGER DEFAULT 0,
  shadow_style TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for frame_presets
ALTER TABLE public.frame_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public frames"
  ON public.frame_presets FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create their own frames"
  ON public.frame_presets FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- 初期ステッカーデータ
INSERT INTO public.sticker_presets (name, category, svg_data, is_public) VALUES
('ハート', 'shape', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>', true),
('星', 'shape', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>', true),
('スマイル', 'emoji', '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="white" fill="none" stroke-width="2"/><circle cx="9" cy="9" r="1" fill="white"/><circle cx="15" cy="9" r="1" fill="white"/></svg>', true);

-- 初期フレームデータ
INSERT INTO public.frame_presets (name, category, border_style, corner_radius, padding, shadow_style, is_public) VALUES
('シンプル', 'simple', '2px solid #000000', 8, 8, 'none', true),
('ポラロイド', 'polaroid', 'none', 4, 16, '0 4px 6px rgba(0,0,0,0.1)', true),
('装飾', 'decorative', '4px double #d4af37', 12, 12, '0 0 20px rgba(212,175,55,0.3)', true),
('シャドウ', 'simple', '1px solid #e5e5e5', 8, 8, '0 8px 16px rgba(0,0,0,0.15)', true);

-- インデックス
CREATE INDEX idx_sticker_presets_category ON public.sticker_presets(category);
CREATE INDEX idx_frame_presets_category ON public.frame_presets(category);