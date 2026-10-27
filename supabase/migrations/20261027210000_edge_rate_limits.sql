-- Edge Function のユーザー単位のレート制限（全インスタンス共通で数える）
--
-- これまでの _shared/security.ts の checkRateLimit は、Edge Function のインスタンスごとのメモリで
-- 数えるだけだった。インスタンスが増える・コールドスタートするたびに数え直しになるので、
-- 「1時間に20回まで」のような上限を確実には守れない。
-- ここでは呼び出しの記録を DB に残し、RPC 1回で「数える → 上限なら断る → 記録する」をまとめて行う。
--
-- 使い方（Edge Function から service role で呼ぶ。_shared/rate-limit.ts の consumeRateLimit）:
--   select * from public.consume_rate_limit(<user_id>, 'scrape-images', 20, 100);
--   → allowed（通してよいか）, retry_after_sec（断ったとき、あと何秒で空くか）,
--     limited_by（'hour' / 'day'、断ったときだけ）, hour_count, day_count（今回の分を含む）
--
-- アプリ（anon / authenticated）からは表も RPC も触れない。RLS を有効にしてポリシーは作らず、
-- 実行権限は service_role にだけ与える。

create table if not exists public.edge_rate_limit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  fn text not null,
  created_at timestamptz not null default now()
);

comment on table public.edge_rate_limit_events is
  'Edge Function のユーザー単位の呼び出し記録（レート制限用）。consume_rate_limit だけが読み書きする。1日より古い行は consume_rate_limit が消す。';

create index if not exists edge_rate_limit_events_user_fn_created_idx
  on public.edge_rate_limit_events (user_id, fn, created_at);

alter table public.edge_rate_limit_events enable row level security;
revoke all on table public.edge_rate_limit_events from public, anon, authenticated;
grant all on table public.edge_rate_limit_events to service_role;

create or replace function public.consume_rate_limit(
  p_user_id uuid,
  p_fn text,
  p_hour_limit integer,
  p_day_limit integer
)
returns table(allowed boolean, retry_after_sec integer, limited_by text, hour_count integer, day_count integer)
language plpgsql
volatile
security definer
set search_path to 'public'
as $function$
declare
  v_now timestamptz := now();
  v_hour integer;
  v_day integer;
  v_expires timestamptz;
begin
  if p_user_id is null or p_fn is null or btrim(p_fn) = '' or p_hour_limit is null or p_day_limit is null
     or p_hour_limit < 1 or p_day_limit < 1 then
    raise exception 'consume_rate_limit: invalid arguments';
  end if;

  -- 同じユーザー・同じ関数の同時呼び出しを1本ずつにする（数えてから記録するまでの間に割り込ませない）
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_fn, 0));

  -- 1日より古い記録はもう数えないので消しておく（表を青天井にしない）
  delete from public.edge_rate_limit_events e
   where e.user_id = p_user_id and e.fn = p_fn and e.created_at < v_now - interval '1 day';

  select count(*) filter (where e.created_at >= v_now - interval '1 hour')::integer,
         count(*)::integer
    into v_hour, v_day
    from public.edge_rate_limit_events e
   where e.user_id = p_user_id and e.fn = p_fn;

  -- 1日の上限が先（こちらのほうが待ち時間が長い）。
  -- 空くのは「上限を超えている分のうち、いちばん古い記録」が期限切れになったとき。
  if v_day >= p_day_limit then
    select e.created_at + interval '1 day' into v_expires
      from public.edge_rate_limit_events e
     where e.user_id = p_user_id and e.fn = p_fn
     order by e.created_at asc
     offset (v_day - p_day_limit) limit 1;
    return query select false,
      greatest(1, ceil(extract(epoch from (v_expires - v_now)))::integer),
      'day'::text, v_hour, v_day;
    return;
  end if;

  if v_hour >= p_hour_limit then
    select e.created_at + interval '1 hour' into v_expires
      from public.edge_rate_limit_events e
     where e.user_id = p_user_id and e.fn = p_fn and e.created_at >= v_now - interval '1 hour'
     order by e.created_at asc
     offset (v_hour - p_hour_limit) limit 1;
    return query select false,
      greatest(1, ceil(extract(epoch from (v_expires - v_now)))::integer),
      'hour'::text, v_hour, v_day;
    return;
  end if;

  insert into public.edge_rate_limit_events (user_id, fn, created_at) values (p_user_id, p_fn, v_now);
  return query select true, 0, null::text, v_hour + 1, v_day + 1;
end;
$function$;

comment on function public.consume_rate_limit(uuid, text, integer, integer) is
  'Edge Function のユーザー単位のレート制限。1時間・1日の件数を数え、上限内なら1件記録して allowed=true を返す。service_role 専用。';

revoke all on function public.consume_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(uuid, text, integer, integer) to service_role;
