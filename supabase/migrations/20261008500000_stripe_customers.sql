-- ユーザーごとに Stripe の顧客を1つだけ持つための対応表。
-- 以前は購入のたびに customer_email だけを渡していたため、Stripe 側に同じ人の顧客が増えていく。
-- サービスロール（Edge Function）だけが読み書きする。
CREATE TABLE IF NOT EXISTS public.stripe_customers (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_customers FROM anon, authenticated;
