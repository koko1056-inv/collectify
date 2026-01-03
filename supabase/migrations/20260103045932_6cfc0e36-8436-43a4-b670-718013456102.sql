
-- ポイント購入パック定義
CREATE TABLE public.point_packages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  price integer NOT NULL, -- 円
  points integer NOT NULL,
  bonus_points integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ポイントショップアイテム定義
CREATE TABLE public.point_shop_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text NOT NULL, -- 'collection', 'room', 'community', 'ai', 'special'
  item_type text NOT NULL, -- 'collection_slots', 'room_slot', 'group_create', 'custom_tags', etc.
  points_cost integer NOT NULL,
  value integer NOT NULL DEFAULT 1, -- 付与される数量（例：コレクション枠50個）
  is_active boolean NOT NULL DEFAULT true,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ユーザーの購入履歴
CREATE TABLE public.user_point_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  shop_item_id uuid NOT NULL REFERENCES public.point_shop_items(id),
  points_spent integer NOT NULL,
  purchased_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ユーザーの上限設定
CREATE TABLE public.user_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  collection_slots integer NOT NULL DEFAULT 100, -- 初期100個
  room_slots integer NOT NULL DEFAULT 1, -- 初期1部屋
  custom_tag_slots integer NOT NULL DEFAULT 10, -- 初期10個
  group_create_count integer NOT NULL DEFAULT 0, -- 作成したグループ数
  ai_image_uses_today integer NOT NULL DEFAULT 0,
  ai_image_last_reset date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS有効化
ALTER TABLE public.point_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_point_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_limits ENABLE ROW LEVEL SECURITY;

-- point_packages: 誰でも閲覧可能
CREATE POLICY "Anyone can view active point packages" ON public.point_packages
  FOR SELECT USING (is_active = true);

-- point_shop_items: 誰でも閲覧可能
CREATE POLICY "Anyone can view active shop items" ON public.point_shop_items
  FOR SELECT USING (is_active = true);

-- user_point_purchases: 自分の購入履歴のみ
CREATE POLICY "Users can view their own purchases" ON public.user_point_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchases" ON public.user_point_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_limits: 自分の上限のみ
CREATE POLICY "Users can view their own limits" ON public.user_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own limits" ON public.user_limits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own limits" ON public.user_limits
  FOR UPDATE USING (auth.uid() = user_id);

-- 初期データ: ポイントパック
INSERT INTO public.point_packages (name, price, points, bonus_points, sort_order) VALUES
  ('お試しパック', 120, 100, 0, 1),
  ('スタンダード', 490, 450, 50, 2),
  ('お得パック', 980, 1000, 100, 3),
  ('プレミアム', 2940, 3000, 500, 4);

-- 初期データ: ショップアイテム
INSERT INTO public.point_shop_items (name, description, category, item_type, points_cost, value, icon, sort_order) VALUES
  -- コレクション関連
  ('コレクション枠 +50', 'グッズを登録できる枠を50個追加', 'collection', 'collection_slots', 100, 50, 'package', 1),
  ('コレクション枠 +100', 'グッズを登録できる枠を100個追加（お得）', 'collection', 'collection_slots', 180, 100, 'package', 2),
  ('カスタムタグ +10', '整理用のカスタムタグ枠を10個追加', 'collection', 'custom_tags', 50, 10, 'tag', 3),
  
  -- ルーム関連
  ('マイルーム追加', '新しいマイルームを1つ追加', 'room', 'room_slot', 200, 1, 'home', 4),
  
  -- コミュニティ関連
  ('グループ作成権', '新しいグループを作成できる権利', 'community', 'group_create', 300, 1, 'users', 5),
  ('グループ上限拡張 +50人', 'グループのメンバー上限を50人追加', 'community', 'group_expand', 100, 50, 'user-plus', 6);

-- ポイント獲得アクション定義を拡張するためpoint_transactionsのtransaction_typeに新しい値を追加
-- （既存のテーブルにはenumではなくtextなので追加作業不要）

-- 連続ログインボーナス用のカラムをuser_pointsに追加
ALTER TABLE public.user_points 
  ADD COLUMN IF NOT EXISTS login_streak integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_date date;

-- updated_atトリガー
CREATE OR REPLACE FUNCTION public.update_user_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_limits_updated_at
  BEFORE UPDATE ON public.user_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_limits_updated_at();
