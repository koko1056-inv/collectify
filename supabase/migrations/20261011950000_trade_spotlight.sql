-- 交換の「注目」（スポットライト）。
--
-- ポイントを使って、一定時間だけ自分の交換グッズを相手側の一覧で先に出す。
-- 対象は「交換に出しているグッズ全部」（_item_ids を渡したときはその品だけ）。
-- 効くのは、相手の画面の
--   - ほしいものを持っている人（find_holders_for_my_wishes の holders の並び）
--   - 両想い・片想いのマッチ（find_trade_matches。両想いの枠は崩さず、その中で先に）
--   - 同じ作品を集めている人（find_trade_series_partners）
--   - 相手が交換に出している品（get_trade_partner_items。相手ごとの品の並び）
-- の並びで、それ以外の順序（同じ扱いどうしの並び）は今までと変えない。
-- ブロックしている／されている相手には、もともとどの一覧にも出ないので、そのまま見えない。
--
-- 値段と時間はクライアントに持たせず、trade_spotlight_plans に置く。

-- 1) プラン（値段・時間）
CREATE TABLE IF NOT EXISTS public.trade_spotlight_plans (
  duration text PRIMARY KEY,
  hours integer NOT NULL CHECK (hours > 0),
  price integer NOT NULL CHECK (price > 0),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.trade_spotlight_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trade_spotlight_plans_read" ON public.trade_spotlight_plans
  FOR SELECT TO authenticated USING (true);

-- 24時間 50pt（ログインボーナス約10日分。はじめての 50pt でも1回は試せる）
-- 3日間 120pt（1日あたり 40pt。週末をまたぐ募集向け）
INSERT INTO public.trade_spotlight_plans (duration, hours, price, sort_order) VALUES
  ('1d', 24, 50, 1),
  ('3d', 72, 120, 2)
ON CONFLICT (duration) DO UPDATE
  SET hours = EXCLUDED.hours, price = EXCLUDED.price, sort_order = EXCLUDED.sort_order;

-- 2) 購入の記録。1回の購入で1行。延長は前の終わりから続く行を足す。
CREATE TABLE IF NOT EXISTS public.trade_spotlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  -- NULL は「交換に出しているグッズ全部」
  item_ids uuid[] NULL,
  duration text NOT NULL,
  points_spent integer NOT NULL CHECK (points_spent >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trade_spotlights_period CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS trade_spotlights_user_ends_idx
  ON public.trade_spotlights (user_id, ends_at DESC);

ALTER TABLE public.trade_spotlights ENABLE ROW LEVEL SECURITY;

-- 読めるのは自分の分だけ。書き込みは buy_trade_spotlight からだけ（ポリシーを作らない）
CREATE POLICY "trade_spotlights_select_own" ON public.trade_spotlights
  FOR SELECT TO authenticated USING (user_id = auth.uid());
