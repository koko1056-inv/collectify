-- 認証なしで呼べてしまっていた特権関数を、呼べる相手だけに絞る。
--
-- 状況（本番で確認）:
--   * grant_points_from_iap  anon / authenticated から実行可。引数の user_id にポイントを
--                            自由に付与できる（既知の product_id と新しい取引IDを渡すだけ）。
--   * update_trust_score     anon / authenticated から実行可。任意ユーザーの信頼スコアを書き換えられる。
--   * increment_usage        anon から実行可。引数の user_id の月間使用量を増やせる。
--
-- 呼び出し元の確認:
--   * grant_points_from_iap  → supabase/functions/revenuecat-webhook（サービスロール）だけ。
--   * update_trust_score     → on_trade_review_insert / on_comment_reaction_insert / on_stamp_replied
--                              （いずれも SECURITY DEFINER のトリガー関数）だけ。クライアントからは呼んでいない。
--   * increment_usage        → src/hooks/useSubscription.ts（ログイン中のユーザー）。
--
-- 適用済み（2026-10-07 本番で実行し、has_function_privilege で結果を確認した）:
--   grant_points_from_iap / update_trust_score は service_role のみ、increment_usage は anon から外した。

revoke all on function public.grant_points_from_iap(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.update_trust_score(uuid, text, numeric) from public, anon, authenticated;
revoke all on function public.increment_usage(uuid, text) from public, anon;

grant execute on function public.grant_points_from_iap(uuid, text, text, text, jsonb) to service_role;
grant execute on function public.update_trust_score(uuid, text, numeric) to service_role;

create or replace function public.increment_usage(p_user_id uuid, p_usage_type text)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  new_count integer;
  current_period date := date_trunc('month', current_date)::date;
begin
  -- ログイン中のユーザーが、他人の使用量を増やせないようにする
  -- （サービスロールなど auth.uid() が無い呼び出しは対象外）。
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'forbidden';
  end if;

  insert into public.user_monthly_usage (user_id, usage_type, period_start, count)
  values (p_user_id, p_usage_type, current_period, 1)
  on conflict (user_id, usage_type, period_start)
  do update set count = public.user_monthly_usage.count + 1
  returning count into new_count;
  return new_count;
end;
$function$;
