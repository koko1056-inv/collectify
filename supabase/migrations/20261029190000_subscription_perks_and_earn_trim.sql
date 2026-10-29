-- サブスクに毎月のポイントをつけ、タダでもらえるポイントを少し減らす
--
-- 関数の本体は本番の定義（現在の正）をもとにしている。変えたところだけ「★」で印を付けた。
--
-- A. サブスクの特典
--  1. user_subscriptions.provider_status: Stripe の生の状態（active / trialing / past_due / canceled …）を残す。
--     status（アプリの状態）は past_due も 'active' にまとめているため、それだけでは「支払いが止まっている」が分からない。
--     apply_stripe_subscription は、別の購読（stripe_subscription_id が変わった）になったら started_at を今にし直す。
--     毎月のポイントは started_at から1か月ごとに数えるので、解約 → 再契約で空いた月の分を渡さないため。
--  2. subscription_point_grants: 毎月のポイントを渡した記録。(購読のキー, 何か月目) が一意なので、
--     Webhook の再送・アプリからの呼び出し・毎日の cron が重なっても、同じ月を2回は渡さない。
--  3. grant_subscription_monthly_points(_user_id): 購読の始まり（started_at）から1か月ごとの区切りのうち、
--     「もう来た（1日前から受け取れる）」かつ「支払い済みの期間（expires_at）の中」の分を、まだならすべて渡す。
--     年額プランも、12か月分を最初にまとめてではなく、毎月その月の分を渡す。
--     渡すのは status = 'active' かつ Stripe の状態が active / trialing のときだけ。
--     past_due（支払いの失敗）・解約・期限切れのあいだは新しく渡さない（渡し済みのポイントはそのまま）。
--     呼ぶのは stripe-webhook（service role）と、下の claim_subscription_points と、毎日の cron。
--  4. claim_subscription_points(): ログインしている本人の分を受け取る（アプリを開いたとき・プランの画面で呼ぶ）。
--  5. grant_all_subscription_monthly_points(): 有効な購読をまとめて処理する。pg_cron で毎日 00:05 JST に動かす。
--  毎月のポイント: プレミアム 600pt / プレミアム+ 1300pt（パック: ¥490 = 500pt, ¥980 = 1100pt より割安）。
--  AI 生成の割引（プレミアム −20% / プレミアム+ −40%）は Edge Function 側（_shared/subscription.ts）で行う。
--  返金・チャージバックのときにポイントを取り消す処理はここでは扱わない。
--
-- B. タダでもらえるポイントを少し減らす（毎日もらえるものを中心に。はじめての人向けの分はそのまま）
--  6. デイリーログイン（7日サイクル）: 10/15/(カバー or 20)/20/25/(フレーム or 20)/30+枠1
--                                   → 8/10/(カバー or 10)/10/15/(フレーム or 15)/20+枠1
--  7. 連続ログインのお祝い: 7日 50 → 40、14日 80 → 60、30日 150+枠1 → 120+枠1
--  8. point_rewards: 今日のポッケリング 10 → 7、今日のミッション 10 → 7、投稿 3 → 2（1日3回まではそのまま）
--  9. グッズの登録（2pt）: 1日10件まで → 8件まで（award_points_on_user_items_insert の上限）
--  ようこそ 50pt・はじめてのステップ 100pt・なかよしLv・コンプ・交換・招待・コメント・反応はそのまま。

-- ─────────────────────────────── 1. 購読の状態 ───────────────────────────────

ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS provider_status text;

COMMENT ON COLUMN public.user_subscriptions.provider_status IS
  '決済サービス側の生の状態（Stripe: active / trialing / past_due / canceled など）。毎月のポイントは active / trialing のときだけ渡す';

CREATE OR REPLACE FUNCTION public.apply_stripe_subscription(_user_id uuid, _plan text, _status text, _customer_id text, _subscription_id text, _period_end timestamp with time zone, _cancel_at_period_end boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _app_status text;
BEGIN
  IF _plan NOT IN ('premium', 'premium_plus') THEN
    RETURN jsonb_build_object('success', false, 'error', 'unknown_plan');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unknown_user');
  END IF;

  _app_status := CASE
    WHEN _status IN ('active', 'trialing', 'past_due') THEN 'active'
    WHEN _status IN ('canceled', 'unpaid', 'incomplete_expired') THEN 'canceled'
    ELSE 'expired'
  END;

  -- ★ provider_status に Stripe の生の状態を残す
  INSERT INTO public.user_subscriptions
    (user_id, plan, status, started_at, expires_at, platform, transaction_id,
     stripe_customer_id, stripe_subscription_id, cancel_at_period_end, provider_status, updated_at)
  VALUES
    (_user_id, _plan, _app_status, now(), _period_end, 'web', _subscription_id,
     _customer_id, _subscription_id, coalesce(_cancel_at_period_end, false), _status, now())
  ON CONFLICT (user_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    -- ★ 別の購読（解約してから契約し直した等）になったら、毎月のポイントの数え始めを今にし直す
    started_at = CASE
      WHEN user_subscriptions.stripe_subscription_id IS DISTINCT FROM EXCLUDED.stripe_subscription_id THEN now()
      ELSE user_subscriptions.started_at
    END,
    expires_at = EXCLUDED.expires_at,
    platform = 'web',
    transaction_id = EXCLUDED.transaction_id,
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    provider_status = EXCLUDED.provider_status,
    updated_at = now();

  RETURN jsonb_build_object('success', true, 'status', _app_status, 'plan', _plan);
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_stripe_subscription(uuid, text, text, text, text, timestamptz, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stripe_subscription(uuid, text, text, text, text, timestamptz, boolean) TO service_role;

-- ─────────────────────────────── 2. 毎月のポイントの記録 ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscription_point_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- 購読のキー（Stripe の subscription id。無ければ transaction_id）
  subscription_key text NOT NULL,
  plan text NOT NULL,
  -- 0 = 最初の月、1 = 2か月目 …（started_at からの月数）
  period_index integer NOT NULL CHECK (period_index >= 0),
  period_start timestamptz NOT NULL,
  points integer NOT NULL CHECK (points > 0),
  granted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscription_point_grants_key_period_key UNIQUE (subscription_key, period_index)
);

CREATE INDEX IF NOT EXISTS subscription_point_grants_user_idx
  ON public.subscription_point_grants (user_id, granted_at DESC);

ALTER TABLE public.subscription_point_grants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_point_grants_select_own" ON public.subscription_point_grants;
CREATE POLICY "subscription_point_grants_select_own" ON public.subscription_point_grants
  FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.subscription_point_grants FROM anon, authenticated;
GRANT SELECT ON public.subscription_point_grants TO authenticated;

-- ─────────────────────────────── 3. 毎月のポイントを渡す ───────────────────────────────

-- プランごとの毎月のポイント。アプリの表示（src/lib/planLimits.ts の PLAN_PERKS）と揃える
CREATE OR REPLACE FUNCTION public.subscription_monthly_points(_plan text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE _plan WHEN 'premium' THEN 600 WHEN 'premium_plus' THEN 1300 ELSE 0 END;
$function$;

CREATE OR REPLACE FUNCTION public.grant_subscription_monthly_points(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _sub public.user_subscriptions%ROWTYPE;
  _key text;
  _per integer;
  _k integer := 0;
  _slot timestamptz;
  _next timestamptz;
  _granted integer := 0;
  _count integer := 0;
  _label text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('granted_points', 0, 'grants', 0, 'active', false);
  END IF;

  -- 同じ人の同時の呼び出し（Webhook とアプリなど）を1本ずつにする
  SELECT * INTO _sub FROM public.user_subscriptions WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('granted_points', 0, 'grants', 0, 'active', false);
  END IF;

  _per := public.subscription_monthly_points(_sub.plan);

  -- 有効で、支払いが止まっておらず、期間の終わりが分かっていて、まだ来ていないときだけ
  IF _sub.status <> 'active'
     OR coalesce(_sub.provider_status, 'active') NOT IN ('active', 'trialing')
     OR _sub.expires_at IS NULL
     OR _sub.expires_at <= now()
     OR _sub.started_at IS NULL
     OR _per <= 0 THEN
    RETURN jsonb_build_object('granted_points', 0, 'grants', 0, 'active', false, 'plan', _sub.plan);
  END IF;

  _key := coalesce(_sub.stripe_subscription_id, _sub.transaction_id, _sub.id::text);
  _label := CASE _sub.plan WHEN 'premium_plus' THEN 'プレミアム+' ELSE 'プレミアム' END;

  -- started_at から1か月ごとの区切り。月の足し算は UTC で行う（Stripe の請求日と同じ数え方。
  -- 1/31 に始めたら 2/28 → 3/31 …）。支払い済みの期間（expires_at より前）の区切りだけを渡す。
  -- 更新の通知が区切りの少し前に届いても渡せるよう、区切りの1日前から受け取れる。
  LOOP
    EXIT WHEN _k > 1200;
    _slot := ((_sub.started_at AT TIME ZONE 'UTC') + make_interval(months => _k)) AT TIME ZONE 'UTC';
    IF _slot >= _sub.expires_at THEN
      _next := NULL;
      EXIT;
    END IF;
    IF _slot > now() + interval '1 day' THEN
      _next := _slot;
      EXIT;
    END IF;

    INSERT INTO public.subscription_point_grants (user_id, subscription_key, plan, period_index, period_start, points)
    VALUES (_user_id, _key, _sub.plan, _k, _slot, _per)
    ON CONFLICT (subscription_key, period_index) DO NOTHING;
    IF FOUND THEN
      PERFORM public.grant_points_internal(
        _user_id, _per, 'subscription_monthly',
        _label || 'の毎月のポイント（' || (_k + 1) || 'か月目）',
        md5('subscription_monthly:' || _key || ':' || _k::text)::uuid
      );
      _granted := _granted + _per;
      _count := _count + 1;
    END IF;
    _k := _k + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'granted_points', _granted,
    'grants', _count,
    'active', true,
    'plan', _sub.plan,
    'monthly_points', _per,
    -- 次に受け取れるようになる日時（支払い済みの期間の中に次の区切りが無ければ null。更新されたら出る）
    'next_grant_at', CASE WHEN _next IS NULL THEN NULL ELSE _next - interval '1 day' END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.grant_subscription_monthly_points(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_subscription_monthly_points(uuid) TO service_role;

-- ─────────────────────────────── 4. 本人が受け取る ───────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_subscription_points()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  RETURN public.grant_subscription_monthly_points(_uid);
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_subscription_points() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_subscription_points() TO authenticated;

-- ─────────────────────────────── 5. 毎日まとめて ───────────────────────────────

CREATE OR REPLACE FUNCTION public.grant_all_subscription_monthly_points()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _u uuid;
  _n integer := 0;
  _r jsonb;
BEGIN
  FOR _u IN
    SELECT s.user_id FROM public.user_subscriptions s
     WHERE s.status = 'active' AND s.expires_at > now()
  LOOP
    BEGIN
      _r := public.grant_subscription_monthly_points(_u);
      _n := _n + coalesce((_r->>'grants')::integer, 0);
    EXCEPTION WHEN OTHERS THEN
      -- 1人の失敗でほかの人の分を止めない（次の日にもう一度試す）
      RAISE WARNING 'grant_subscription_monthly_points failed for %: %', _u, SQLERRM;
    END;
  END LOOP;
  RETURN _n;
END;
$function$;

REVOKE ALL ON FUNCTION public.grant_all_subscription_monthly_points() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_all_subscription_monthly_points() TO service_role;

-- pg_cron が無い環境（ローカルなど）では何もしない。cron.job は pg_cron があるときだけ読む
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'grant-subscription-points') THEN
      -- 毎日 00:05 JST（15:05 UTC）
      PERFORM cron.schedule('grant-subscription-points', '5 15 * * *', 'SELECT public.grant_all_subscription_monthly_points()');
    END IF;
  END IF;
END $$;

-- ─────────────────────────────── 6・7. デイリーログイン ───────────────────────────────

-- cosmetic_* の日の points は「着せ替えを全部持っていたときに代わりに渡す pt」
UPDATE public.daily_login_calendar SET points = 8  WHERE cycle_day = 1;
UPDATE public.daily_login_calendar SET points = 10 WHERE cycle_day = 2;
UPDATE public.daily_login_calendar SET points = 10 WHERE cycle_day = 3;
UPDATE public.daily_login_calendar SET points = 10 WHERE cycle_day = 4;
UPDATE public.daily_login_calendar SET points = 15 WHERE cycle_day = 5;
UPDATE public.daily_login_calendar SET points = 15 WHERE cycle_day = 6;
UPDATE public.daily_login_calendar SET points = 20 WHERE cycle_day = 7;

UPDATE public.daily_login_milestones SET bonus_points = 40  WHERE streak_days = 7;
UPDATE public.daily_login_milestones SET bonus_points = 60  WHERE streak_days = 14;
UPDATE public.daily_login_milestones SET bonus_points = 120 WHERE streak_days = 30;

-- ─────────────────────────────── 8. 毎日の報酬の額 ───────────────────────────────

UPDATE public.point_rewards SET points = 7 WHERE reason = 'daily_ring';
UPDATE public.point_rewards SET points = 7 WHERE reason = 'daily_mission';
UPDATE public.point_rewards SET points = 2 WHERE reason = 'post_create';

-- ─────────────────────────────── 9. グッズの登録の1日の上限 ───────────────────────────────

CREATE OR REPLACE FUNCTION public.award_points_on_user_items_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _r record;
  _k record;
  _owned integer;
  _total integer;
  _ref uuid;
  _points integer;
begin
  for _r in
    select n.user_id, n.id, n.official_item_id from new_rows n order by n.created_at, n.id
  loop
    -- ★ 1日10件 → 8件まで
    perform public.award_social_points(_r.user_id, 'item_register', coalesce(_r.official_item_id, _r.id), 8);
  end loop;

  for _k in
    select x.user_id, x.key, min(x.label) as label
      from (
        select n.user_id, lower(btrim(oi.content_name)) as key, btrim(oi.content_name) as label
          from new_rows n
          join public.official_items oi on oi.id = n.official_item_id and oi.merged_into is null
         where oi.content_name is not null and btrim(oi.content_name) not in ('', 'なし')
        union all
        select n.user_id, lower(btrim(t.name)), btrim(t.name)
          from new_rows n
          join public.item_tags it on it.official_item_id = n.official_item_id
          join public.tags t on t.id = it.tag_id and t.category = 'series'
         where t.name is not null and btrim(t.name) not in ('', 'なし')
      ) x
     group by x.user_id, x.key
  loop
    _owned := public.owned_in_series_key(_k.user_id, _k.key);
    if _owned < 3 then
      continue;
    end if;
    _total := public.catalog_in_series_key(_k.key, _owned);
    if _total >= 3 and _owned >= _total then
      _ref := md5('series_complete:' || _k.key)::uuid;
      perform public.award_social_points(_k.user_id, 'series_complete', _ref, 3);
      select case when exists (
               select 1 from public.point_reward_claims c
                where c.user_id = _k.user_id and c.reason = 'series_complete' and c.reference_id = _ref
                  and c.created_at >= now()
             ) then (select coalesce(points, 0) from public.point_rewards where reason = 'series_complete') else 0 end
        into _points;
      insert into public.user_completions (user_id, key, label, total, points)
      values (_k.user_id, _k.key, _k.label, _owned, _points)
      on conflict (user_id, key) do nothing;
    end if;
  end loop;

  return null;
end;
$function$;

revoke all on function public.award_points_on_user_items_insert() from public, anon, authenticated;
