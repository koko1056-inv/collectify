-- user_itemsテーブルに3Dモデル関連カラムを追加
ALTER TABLE public.user_items 
ADD COLUMN IF NOT EXISTS model_3d_url text,
ADD COLUMN IF NOT EXISTS model_3d_task_id text;