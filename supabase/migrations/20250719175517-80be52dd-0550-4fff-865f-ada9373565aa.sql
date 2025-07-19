-- ユーザーポイント残高テーブル
CREATE TABLE public.user_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  last_login_bonus_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ポイント履歴テーブル
CREATE TABLE public.point_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  reference_id UUID, -- 関連するアイテムIDなど
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 称号マスタテーブル
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  required_points INTEGER,
  required_action_count INTEGER,
  action_type TEXT, -- 'item_add', 'login', 'content_add'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ユーザー称号獲得テーブル
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- RLS有効化
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLSポリシー設定
-- user_points
CREATE POLICY "Users can view their own points" 
ON public.user_points 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own points" 
ON public.user_points 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own points" 
ON public.user_points 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- point_transactions
CREATE POLICY "Users can view their own transactions" 
ON public.point_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" 
ON public.point_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- achievements
CREATE POLICY "Anyone can view achievements" 
ON public.achievements 
FOR SELECT 
USING (true);

-- user_achievements
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements" 
ON public.user_achievements 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- updated_at更新関数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- user_pointsテーブルのupdated_atトリガー
CREATE TRIGGER update_user_points_updated_at
  BEFORE UPDATE ON public.user_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 初期称号データ挿入
INSERT INTO public.achievements (name, description, required_points, action_type) VALUES
('ビギナー', '初回ログインでもらえる称号', 1, 'login'),
('コレクター', 'グッズを10個追加すると獲得', null, 'item_add'),
('エキスパート', '100ポイント達成で獲得', 100, null),
('レジェンド', '500ポイント達成で獲得', 500, null),
('クリエイター', 'コンテンツを5個追加すると獲得', null, 'content_add');

-- グッズ追加、コンテンツ追加のアクション数を管理するためのカウンター更新
UPDATE public.achievements SET required_action_count = 10 WHERE action_type = 'item_add';
UPDATE public.achievements SET required_action_count = 5 WHERE action_type = 'content_add';