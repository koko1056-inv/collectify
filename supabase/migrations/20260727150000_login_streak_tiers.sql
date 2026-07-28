-- =========================================================
-- ログインボーナスを連続ログイン日数に応じて増やす
--
-- claim_login_bonus は login_streak を計算・記録していたが、報酬は 10pt 固定で
-- ストリークが報酬に反映されていなかった。一方 UI には
-- 「連続ログインボーナス: ストリーク数に応じて加算」と表示されていた。
--
-- 報酬額はマイグレーションなしで調整できるよう、テーブルで持つ。
-- =========================================================

CREATE TABLE IF NOT EXISTS public.login_bonus_tiers (
  -- この日数以上の連続ログインで points が適用される
  min_streak integer PRIMARY KEY CHECK (min_streak >= 1),
  points integer NOT NULL CHECK (points > 0)
);

ALTER TABLE public.login_bonus_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "login_bonus_tiers_select" ON public.login_bonus_tiers;
CREATE POLICY "login_bonus_tiers_select" ON public.login_bonus_tiers
  FOR SELECT USING (true);
-- 書き込みポリシーは作らない（service_role / 管理者のみ）

INSERT INTO public.login_bonus_tiers (min_streak, points) VALUES
  (1,  10),
  (3,  15),
  (7,  20),
  (14, 30),
  (30, 50)
ON CONFLICT (min_streak) DO UPDATE SET points = EXCLUDED.points;


CREATE OR REPLACE FUNCTION public.claim_login_bonus(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _last_login_date date;
  _login_streak integer;
  _bonus_points integer;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Permission denied: cannot claim another user''s login bonus';
  END IF;

  -- 行が無い場合は先に作り、必ずロックを取れる状態にする
  INSERT INTO public.user_points (user_id, total_points)
  VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT last_login_bonus_date, login_streak
    INTO _last_login_date, _login_streak
    FROM public.user_points
   WHERE user_id = _user_id
     FOR UPDATE;

  IF _last_login_date = CURRENT_DATE THEN
    RETURN false; -- 本日分は受け取り済み
  END IF;

  -- 前日に受け取っていれば継続、そうでなければ 1 日目に戻る
  IF _last_login_date = CURRENT_DATE - 1 THEN
    _login_streak := COALESCE(_login_streak, 0) + 1;
  ELSE
    _login_streak := 1;
  END IF;

  -- 該当する最上位のティアを採用する
  SELECT points INTO _bonus_points
    FROM public.login_bonus_tiers
   WHERE min_streak <= _login_streak
   ORDER BY min_streak DESC
   LIMIT 1;

  -- ティアが未設定でも受け取りが止まらないようにする
  _bonus_points := COALESCE(_bonus_points, 10);

  UPDATE public.user_points
     SET total_points = total_points + _bonus_points,
         last_login_bonus_date = CURRENT_DATE,
         login_streak = _login_streak,
         last_login_date = CURRENT_DATE,
         updated_at = now()
   WHERE user_id = _user_id;

  INSERT INTO public.point_transactions (user_id, points, transaction_type, description)
  VALUES (_user_id, _bonus_points, 'login_bonus',
          'ログインボーナス (ストリーク: ' || _login_streak || ')');

  RETURN true;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_login_bonus(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_login_bonus(uuid) TO authenticated;


-- ---------------------------------------------------------
-- マスタテーブルの読み取り権限を明示する
--
-- RLS の SELECT ポリシーだけでは足りず、テーブルレベルの GRANT も必要。
-- Supabase の ALTER DEFAULT PRIVILEGES に暗黙に頼らず明示しておく
-- （前のマイグレーションで作った 2 テーブルも合わせて付与する）。
-- ---------------------------------------------------------
GRANT SELECT ON public.login_bonus_tiers TO anon, authenticated;
GRANT SELECT ON public.point_rewards TO anon, authenticated;
GRANT SELECT ON public.onboarding_reward_steps TO anon, authenticated;
GRANT SELECT ON public.point_reward_claims TO authenticated;

-- 書き込みは行わせない（更新は service_role / 管理者のみ）
REVOKE INSERT, UPDATE, DELETE ON public.login_bonus_tiers FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.point_rewards FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.onboarding_reward_steps FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.point_reward_claims FROM anon, authenticated;
