-- binder_itemsに3DモデルURL用のカラムを追加
ALTER TABLE public.binder_items 
ADD COLUMN IF NOT EXISTS model_3d_url TEXT DEFAULT NULL;

-- 3D生成タスクIDを保存するカラムも追加（生成中のステータス確認用）
ALTER TABLE public.binder_items 
ADD COLUMN IF NOT EXISTS model_3d_task_id TEXT DEFAULT NULL;

-- コメント追加
COMMENT ON COLUMN public.binder_items.model_3d_url IS 'URL of the generated 3D model (GLB format)';
COMMENT ON COLUMN public.binder_items.model_3d_task_id IS 'Meshy API task ID for 3D generation';