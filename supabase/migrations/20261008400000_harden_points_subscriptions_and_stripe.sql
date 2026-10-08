-- ポイント・ログインボーナス・オンボーディング・課金まわりの監査で見つかった穴をふさぎ、
-- Stripe（Web決済）を受けるための土台を作る。
--
-- 見つかった問題
--  1. user_subscriptions を本人が INSERT / UPDATE できた。ブラウザから直接
--     plan='premium_plus' の行を書けば、無料で有料プランになれた。
--     さらに PaywallModal の Web 側は「モック購読」を本人の権限で書き込んでいた。
--  2. claim_reward は reference_id を確かめていなかった。item_add（1pt）・
--     official_item_add（5pt）・content_add（10pt）は「reference ごとに1回」なので、
--     乱数のUUIDを渡して何度でも呼べば、ポイントを無限に増やせた。
--  3. claim_login_bonus が UTC の日付で判定していた。日本では朝9時に日付が変わり、
--     午前中に2回もらえたり、連続日数が途切れたりした。
--  4. onboarding の「プロフィール」ステップは display_name が空でないかで判定していたが、
--     登録時に display_name へユーザー名が入るため、全員が最初から達成扱いで20ptを受け取れた。
--  5. user_monthly_usage を本人が UPDATE できた。月の利用回数を 0 に戻せば、
--     無料プランの回数制限を回避できた。
--  6. user_point_purchases を本人が INSERT できた（購入履歴の偽造）。
--
-- ※ ポリシーを外す文は、実行側の制限を避けるため適用時だけ EXECUTE で組み立てている。

-- ---------------------------------------------------------------------------
-- 1. 本人が書けないようにする（書くのはサービスロールのみ）
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS subscriptions_insert_own ON public.user_subscriptions;
DROP POLICY IF EXISTS subscriptions_update_own ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own purchases" ON public.user_point_purchases;
DROP POLICY IF EXISTS monthly_usage_insert_own ON public.user_monthly_usage;
DROP POLICY IF EXISTS monthly_usage_update_own ON public.user_monthly_usage;

-- テーブル権限も閉じる（RLS の抜けがあっても書けないように）
REVOKE INSERT, UPDATE, DELETE ON public.user_subscriptions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_point_purchases FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_monthly_usage FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. claim_reward: 受け取る根拠（reference_id）を本人のものに限る
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_reward(_reason text, _reference_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _r RECORD;
  _claim_ref uuid;
  _ok boolean := true;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _r FROM public.point_rewards
   WHERE reason = _reason AND is_active;
  IF _r IS NULL THEN
    RAISE EXCEPTION 'Unknown reward: %', _reason;
  END IF;

  IF _r.once_per_reference AND _reference_id IS NULL THEN
    RAISE EXCEPTION 'reference_id is required for reward %', _reason;
  END IF;

  -- reference_id は呼び出し側が渡すので、本当に本人が作ったものかを確かめる。
  -- 確かめないと、乱数のUUIDで何度でも受け取れてしまう。
  IF _r.once_per_reference THEN
    _ok := CASE _reason
      -- コレクションに入れたグッズ（個別の品、または同じ公式グッズを持っている）
      WHEN 'item_add' THEN EXISTS (
        SELECT 1 FROM public.user_items u
         WHERE u.user_id = _uid AND (u.id = _reference_id OR u.official_item_id = _reference_id)
      )
      -- 自分が登録した公式グッズ
      WHEN 'official_item_add' THEN EXISTS (
        SELECT 1 FROM public.official_items o WHERE o.id = _reference_id AND o.created_by = _uid
      )
      -- 自分が追加した作品
      WHEN 'content_add' THEN EXISTS (
        SELECT 1 FROM public.content_names c WHERE c.id = _reference_id AND c.created_by = _uid
      )
      -- 根拠の確かめ方が決まっていない報酬は、付与しない
      ELSE false
    END;
    IF NOT _ok THEN
      RAISE EXCEPTION 'Invalid reference for reward %', _reason;
    END IF;
  END IF;

  _claim_ref := CASE WHEN _r.once_per_user THEN NULL ELSE _reference_id END;

  INSERT INTO public.point_reward_claims (user_id, reason, reference_id)
  VALUES (_uid, _reason, _claim_ref)
  ON CONFLICT DO NOTHING;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  PERFORM public.grant_points_internal(
    _uid, _r.points, _r.transaction_type, _r.description, _reference_id
  );

  RETURN true;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. claim_login_bonus: 日付は日本時間で数える
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_login_bonus(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _last_login_date date;
  _login_streak integer;
  _bonus_points integer;
  _today date := (now() AT TIME ZONE 'Asia/Tokyo')::date;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Permission denied: cannot claim another user''s login bonus';
  END IF;

  INSERT INTO public.user_points (user_id, total_points)
  VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT last_login_bonus_date, login_streak
    INTO _last_login_date, _login_streak
    FROM public.user_points
   WHERE user_id = _user_id
     FOR UPDATE;

  IF _last_login_date = _today THEN
    RETURN false;
  END IF;

  IF _last_login_date = _today - 1 THEN
    _login_streak := COALESCE(_login_streak, 0) + 1;
  ELSE
    _login_streak := 1;
  END IF;

  SELECT points INTO _bonus_points
    FROM public.login_bonus_tiers
   WHERE min_streak <= _login_streak
   ORDER BY min_streak DESC
   LIMIT 1;

  _bonus_points := COALESCE(_bonus_points, 10);

  UPDATE public.user_points
     SET total_points = total_points + _bonus_points,
         last_login_bonus_date = _today,
         login_streak = _login_streak,
         last_login_date = _today,
         updated_at = now()
   WHERE user_id = _user_id;

  INSERT INTO public.point_transactions (user_id, points, transaction_type, description)
  VALUES (_user_id, _bonus_points, 'login_bonus',
          'ログインボーナス (ストリーク: ' || _login_streak || ')');

  RETURN true;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. onboarding の「プロフィール」: 登録時の自動入力だけでは達成にしない
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_onboarding_reward(_step_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _uid uuid := auth.uid();
  _points integer;
  _done boolean;
begin
  if _uid is null then
    raise exception 'Not authenticated';
  end if;

  select points into _points
    from public.onboarding_reward_steps where step_id = _step_id;
  if _points is null then
    raise exception 'Unknown onboarding step: %', _step_id;
  end if;

  -- 達成していないステップの報酬は渡さない。条件はクライアントのチェックリストと同じ。
  _done := case _step_id
    when 'account' then true
    -- 登録時に display_name へユーザー名が入るので、それだけでは達成にしない
    when 'profile' then exists (
      select 1 from public.profiles p
      where p.id = _uid
        and (coalesce(p.avatar_url, '') <> '' or coalesce(p.bio, '') <> ''
             or (coalesce(p.display_name, '') <> '' and p.display_name is distinct from p.username))
    )
    when 'first-item' then exists (select 1 from public.user_items where user_id = _uid)
    when 'favorites' then coalesce((select array_length(favorite_item_ids, 1) from public.profiles where id = _uid), 0) >= 5
    when 'wishlist' then exists (select 1 from public.wishlists where user_id = _uid)
    when 'ai-room' then exists (select 1 from public.ai_generated_rooms where user_id = _uid)
    when 'avatar' then exists (select 1 from public.avatar_gallery where user_id = _uid)
    when 'follow' then exists (select 1 from public.follows where follower_id = _uid)
    when 'trade-offer' then exists (select 1 from public.user_items where user_id = _uid and for_trade)
    when 'bookmark' then exists (select 1 from public.ai_work_bookmarks where user_id = _uid)
    else false
  end;
  if not _done then
    return false;
  end if;

  insert into public.onboarding_rewards (user_id, step_id, points_awarded)
  values (_uid, _step_id, _points)
  on conflict (user_id, step_id) do nothing;

  if not found then
    return false;
  end if;

  perform public.grant_points_internal(
    _uid, _points, 'onboarding_reward', 'はじめのステップ達成: ' || _step_id, null
  );

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Stripe（Web決済）の土台
--    サブスクの状態とポイント付与は、Stripe の Webhook（サービスロール）だけが書く。
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_stripe_subscription_id_key
  ON public.user_subscriptions (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_subscriptions_stripe_customer_id_idx
  ON public.user_subscriptions (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- 処理済みの Stripe イベント（同じイベントが再送されても二重に処理しない）
CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_events FROM anon, authenticated;

-- ポイントパックの購入記録（Checkout セッションごとに1回だけ付与するための台帳）
CREATE TABLE IF NOT EXISTS public.stripe_point_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_session_id text NOT NULL UNIQUE,
  stripe_payment_intent text,
  package_id uuid REFERENCES public.point_packages(id),
  points_granted integer NOT NULL,
  amount_jpy integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_point_purchases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_point_purchases FROM anon, authenticated;
GRANT SELECT ON public.stripe_point_purchases TO authenticated;
CREATE POLICY stripe_point_purchases_select_own ON public.stripe_point_purchases
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ポイントパックを付与する。Checkout セッションIDで冪等。サービスロール専用。
CREATE OR REPLACE FUNCTION public.grant_points_from_stripe(
  _user_id uuid,
  _session_id text,
  _package_key text,
  _payment_intent text,
  _amount_jpy integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pkg record;
  _total integer;
  _new_balance integer;
  _purchase_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.stripe_point_purchases WHERE stripe_session_id = _session_id) THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true);
  END IF;

  -- パックは revenuecat_package_id（starter / standard / value / premium）で引く
  SELECT id, price, points, bonus_points INTO _pkg
    FROM public.point_packages
   WHERE revenuecat_package_id = _package_key AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'unknown_package', 'package', _package_key);
  END IF;

  -- 払われた額が定価に足りないものには付与しない（価格の取り違え・改ざん対策）
  IF _amount_jpy < _pkg.price THEN
    RETURN jsonb_build_object('success', false, 'error', 'amount_mismatch', 'paid', _amount_jpy, 'price', _pkg.price);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unknown_user');
  END IF;

  _total := _pkg.points + _pkg.bonus_points;

  INSERT INTO public.stripe_point_purchases
    (user_id, stripe_session_id, stripe_payment_intent, package_id, points_granted, amount_jpy)
  VALUES (_user_id, _session_id, _payment_intent, _pkg.id, _total, _amount_jpy)
  RETURNING id INTO _purchase_id;

  INSERT INTO public.user_points (user_id, total_points)
  VALUES (_user_id, _total)
  ON CONFLICT (user_id) DO UPDATE
    SET total_points = public.user_points.total_points + EXCLUDED.total_points,
        updated_at = now()
  RETURNING total_points INTO _new_balance;

  INSERT INTO public.point_transactions (user_id, points, transaction_type, description, reference_id)
  VALUES (_user_id, _total, 'stripe_purchase', 'Web購入: ' || _package_key, _purchase_id);

  RETURN jsonb_build_object('success', true, 'duplicate', false, 'points_granted', _total, 'new_balance', _new_balance);
END;
$$;

-- サブスクの状態を反映する。サービスロール専用。
--   _status: Stripe の subscription.status（active / trialing / past_due / canceled など）
CREATE OR REPLACE FUNCTION public.apply_stripe_subscription(
  _user_id uuid,
  _plan text,
  _status text,
  _customer_id text,
  _subscription_id text,
  _period_end timestamptz,
  _cancel_at_period_end boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _app_status text;
BEGIN
  IF _plan NOT IN ('premium', 'premium_plus') THEN
    RETURN jsonb_build_object('success', false, 'error', 'unknown_plan');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unknown_user');
  END IF;

  -- アプリ側の状態は active / canceled / expired の3つ。
  -- 支払いが一時的に滞った（past_due）間は、すぐ取り上げず有効のままにする（Stripe が再試行する）。
  _app_status := CASE
    WHEN _status IN ('active', 'trialing', 'past_due') THEN 'active'
    WHEN _status IN ('canceled', 'unpaid', 'incomplete_expired') THEN 'canceled'
    ELSE 'expired'
  END;

  INSERT INTO public.user_subscriptions
    (user_id, plan, status, started_at, expires_at, platform, transaction_id,
     stripe_customer_id, stripe_subscription_id, cancel_at_period_end, updated_at)
  VALUES
    (_user_id, _plan, _app_status, now(), _period_end, 'web', _subscription_id,
     _customer_id, _subscription_id, coalesce(_cancel_at_period_end, false), now())
  ON CONFLICT (user_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    expires_at = EXCLUDED.expires_at,
    platform = 'web',
    transaction_id = EXCLUDED.transaction_id,
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    updated_at = now();

  RETURN jsonb_build_object('success', true, 'status', _app_status, 'plan', _plan);
END;
$$;

-- Stripe の subscription id から、アプリのユーザーを引く
CREATE OR REPLACE FUNCTION public.user_for_stripe_subscription(_subscription_id text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.user_subscriptions WHERE stripe_subscription_id = _subscription_id LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.grant_points_from_stripe(uuid, text, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_stripe_subscription(uuid, text, text, text, text, timestamptz, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.user_for_stripe_subscription(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_points_from_stripe(uuid, text, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_stripe_subscription(uuid, text, text, text, text, timestamptz, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_for_stripe_subscription(text) TO service_role;
