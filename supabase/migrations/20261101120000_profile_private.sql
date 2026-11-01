-- 本人だけが読み書きできる「あなたのこと」（性別・年代・都道府県・推し活のこと）
--
-- なぜ profiles に足さないか:
--   profiles の SELECT は "profiles_select_policy"（20260405140712_…sql）で
--   「本人 OR privacy_level = 'public' OR フォロワー」。TO 句が無いので未ログイン（anon）も含め、
--   公開プロフィールの行は誰でも select * で全部の列を読める（列ごとの REVOKE もしていない）。
--   ここに性別・年代・住んでいる所を足すと、他人から読めてしまう。
--   そこで別のテーブルにし、RLS で本人（auth.uid() = user_id）だけに絞る。公開ビューも作らない。
--
-- すべて任意: どの列も NULL でよい（NOT NULL・既定値の強制なし）。行が無くてもよい。
--   - アプリは、ウェルカムの「あなたのこと」ステップを通った・すでに使っている人への案内を閉じた、
--     ときにも空の行を作り、「もう聞いた」の印にする（行が無い = まだ一度も聞いていない）。
--   - 公式サンプルアカウント（profiles.is_sample）には、アプリはこのステップも案内も出さない。
--     DB 側で何かを必須にはしないので、サンプルアカウントの作成・ログインの流れには影響しない。
--
-- 値の選択肢はアプリの src/lib/profileExtras.ts と揃える（scripts/test-profile-extras.mjs が照らし合わせる）。
-- 年代は利用規約（13歳未満は利用不可）にあわせて 10代（13〜19歳）から。
-- 都道府県は ISO 3166-2 の "JP-01"（北海道）〜 "JP-47"（沖縄県）。

CREATE TABLE IF NOT EXISTS public.profile_private (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gender text
    CONSTRAINT profile_private_gender_check
    CHECK (gender IN ('female', 'male', 'other', 'no_answer')),
  age_range text
    CONSTRAINT profile_private_age_range_check
    CHECK (age_range IN ('13_19', '20s', '30s', '40s', '50_plus', 'no_answer')),
  prefecture text
    CONSTRAINT profile_private_prefecture_check
    CHECK (prefecture ~ '^JP-(0[1-9]|[1-3][0-9]|4[0-7])$'),
  -- 推し活歴
  oshi_years text
    CONSTRAINT profile_private_oshi_years_check
    CHECK (oshi_years IN ('just_started', 'lt_1y', '1_3y', '3_5y', '5y_plus')),
  -- 月のグッズ予算
  monthly_budget text
    CONSTRAINT profile_private_monthly_budget_check
    CHECK (monthly_budget IN ('lt_3k', '3k_10k', '10k_30k', '30k_plus', 'secret')),
  -- よく買うグッズ（複数）
  goods_types text[]
    CONSTRAINT profile_private_goods_types_check
    CHECK (
      goods_types <@ ARRAY['can_badge', 'acrylic_stand', 'acrylic_keychain', 'plush', 'trading_card', 'gacha_kuji', 'cd_live', 'other']::text[]
      AND cardinality(goods_types) <= 8
    ),
  -- グッズの交換をするか
  trade_frequency text
    CONSTRAINT profile_private_trade_frequency_check
    CHECK (trade_frequency IN ('often', 'sometimes', 'never')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profile_private IS
  '本人だけが読み書きできる任意のプロフィール（性別・年代・都道府県・推し活のこと）。公開プロフィール（profiles）には出さない。行がある = アプリで一度聞いた';

ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_private_select_own" ON public.profile_private;
CREATE POLICY "profile_private_select_own" ON public.profile_private
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profile_private_insert_own" ON public.profile_private;
CREATE POLICY "profile_private_insert_own" ON public.profile_private
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profile_private_update_own" ON public.profile_private;
CREATE POLICY "profile_private_update_own" ON public.profile_private
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 未ログインには何も渡さない。本人も削除はしない（答えを消すときは各列を NULL に戻す）。
-- 退会時は auth.users の削除で一緒に消える（ON DELETE CASCADE）。
REVOKE ALL ON public.profile_private FROM anon;
REVOKE ALL ON public.profile_private FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profile_private TO authenticated;

DROP TRIGGER IF EXISTS update_profile_private_updated_at ON public.profile_private;
CREATE TRIGGER update_profile_private_updated_at
  BEFORE UPDATE ON public.profile_private
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
