-- room_furniture: 家具の配置を永続化するテーブル
CREATE TABLE IF NOT EXISTS public.room_furniture (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.binder_pages(id) ON DELETE CASCADE,
  furniture_id TEXT NOT NULL,           -- furniturePresets.tsのid (e.g. 'chair_gaming')
  position_x REAL NOT NULL DEFAULT 50,  -- 0-100 normalized
  position_y REAL NOT NULL DEFAULT 50,  -- 0-100 normalized
  placement TEXT NOT NULL DEFAULT 'floor' CHECK (placement IN ('floor', 'back_wall', 'left_wall')),
  scale REAL NOT NULL DEFAULT 1.0,
  rotation_y REAL NOT NULL DEFAULT 0,
  z_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX idx_room_furniture_room_id ON public.room_furniture(room_id);

-- RLS有効化
ALTER TABLE public.room_furniture ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧可能（他人のルームを見る）
CREATE POLICY "room_furniture_select_all" ON public.room_furniture
  FOR SELECT USING (true);

-- 自分のルームの家具のみ操作可能
CREATE POLICY "room_furniture_insert_own" ON public.room_furniture
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.binder_pages bp
      WHERE bp.id = room_id AND bp.user_id = auth.uid()
    )
  );

CREATE POLICY "room_furniture_update_own" ON public.room_furniture
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.binder_pages bp
      WHERE bp.id = room_id AND bp.user_id = auth.uid()
    )
  );

CREATE POLICY "room_furniture_delete_own" ON public.room_furniture
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.binder_pages bp
      WHERE bp.id = room_id AND bp.user_id = auth.uid()
    )
  );

-- binder_itemsにplacementカラムを追加（rotationハックを廃止）
ALTER TABLE public.binder_items
  ADD COLUMN IF NOT EXISTS placement TEXT DEFAULT 'floor'
  CHECK (placement IN ('floor', 'back_wall', 'left_wall'));

-- 既存データのマイグレーション: rotationからplacementへ変換
UPDATE public.binder_items
SET placement = CASE
  WHEN rotation = 90 THEN 'back_wall'
  WHEN rotation = 180 THEN 'left_wall'
  ELSE 'floor'
END
WHERE placement IS NULL OR placement = 'floor';

-- binder_itemsにitem_rotation追加（アイテムの3D回転角度を永続化）
ALTER TABLE public.binder_items
  ADD COLUMN IF NOT EXISTS item_rotation REAL DEFAULT 0;

-- updated_atの自動更新トリガー
CREATE OR REPLACE FUNCTION update_room_furniture_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_room_furniture_updated_at
  BEFORE UPDATE ON public.room_furniture
  FOR EACH ROW
  EXECUTE FUNCTION update_room_furniture_updated_at();
