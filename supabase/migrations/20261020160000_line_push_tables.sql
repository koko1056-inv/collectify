-- LINE通知（友だち追加の案内・推しの新商品・交換の返事・デイリーログインの催促）の土台
--
-- 【前提・既存の実態】
--   public.line_user_links は本番にすでにある（LiffAutoLink.tsx が LIFF 経由で作っている）が、
--   この行を作ったマイグレーションがリポジトリに無い。列は line_user_id text / user_id uuid / linked_at
--   timestamptz のみ（RLS: 本人の select/insert/delete）。ここでは `create table if not exists` で
--   同じ定義を記録として残し、既存を壊さずに必要な列だけ `add column if not exists` で足す。
--
--   public.line_notification_prefs も本番にすでにある
--   （20261016060521_oshi_new_items_digest.sql が line_notification_prefs.new_goods を読んでいる）。
--   こちらも定義がリポジトリに無いので、型定義（src/integrations/supabase/types.ts）から判明した
--   実際の列（new_goods / trade / reactions / memories / ai_rooms / weekly_digest / quiet_start /
--   quiet_end / updated_at / user_id）に合わせて `create table if not exists` で記録する。
--   「LINE通知」の一括ON/OFFは line_user_links.notify_enabled（新設）が受け持ち、
--   この表の new_goods / trade は推しの新商品・交換の返事をカテゴリ別に止めるための既存の仕組みとして
--   そのまま使う（quiet_start/quiet_end も、22〜8時の静音時間としてそのまま使う）。
--
--   これらのテーブルは本番にすでにあるため、このマイグレーションは本番に対しては何もしない
--   （create table if not exists / add column if not exists は実質ノーオペ）。
--   まだ適用されていない環境（新規セットアップ）でも同じ状態になるようにするための記録。

-- ---------------------------------------------------------------------------
-- 1. line_user_links（既存の記録 + 新しい列）
-- ---------------------------------------------------------------------------
create table if not exists public.line_user_links (
  line_user_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  linked_at timestamptz not null default now(),
  primary key (line_user_id)
);

alter table public.line_user_links
  add column if not exists notify_enabled boolean not null default true,
  add column if not exists friend_added boolean,
  add column if not exists last_push_at timestamptz;

comment on column public.line_user_links.notify_enabled is
  'マイページ「LINE通知」トグル。falseなら推しの新商品・交換の返事・デイリーログインの催促を一切送らない。';
comment on column public.line_user_links.friend_added is
  'LINE公式アカウントの友だちか。null=未確認（届くか試す）。follow/unfollowのWebhookで更新。pushが403のときもfalseにする。';
comment on column public.line_user_links.last_push_at is
  '直近でLINE pushを送った時刻（運用確認用。送信頻度の制御は line_push_log で行う）。';

alter table public.line_user_links enable row level security;

drop policy if exists "line_user_links_select_own" on public.line_user_links;
create policy "line_user_links_select_own" on public.line_user_links
  for select using (auth.uid() = user_id);

drop policy if exists "line_user_links_insert_own" on public.line_user_links;
create policy "line_user_links_insert_own" on public.line_user_links
  for insert with check (auth.uid() = user_id);

drop policy if exists "line_user_links_delete_own" on public.line_user_links;
create policy "line_user_links_delete_own" on public.line_user_links
  for delete using (auth.uid() = user_id);

-- notify_enabled だけ本人が直接更新できる（is_sample と同じ「列だけ許可」の形）。
-- friend_added / last_push_at は service_role（line-webhook / line-push）だけが書く。
drop policy if exists "line_user_links_update_own" on public.line_user_links;
create policy "line_user_links_update_own" on public.line_user_links
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke update on public.line_user_links from authenticated;
grant update (notify_enabled) on public.line_user_links to authenticated;

-- ---------------------------------------------------------------------------
-- 2. line_notification_prefs（既存の記録）
-- ---------------------------------------------------------------------------
create table if not exists public.line_notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  new_goods boolean not null default true,
  trade boolean not null default true,
  reactions boolean not null default true,
  memories boolean not null default true,
  ai_rooms boolean not null default true,
  weekly_digest boolean not null default true,
  quiet_start smallint not null default 22,
  quiet_end smallint not null default 8,
  updated_at timestamptz not null default now()
);

comment on table public.line_notification_prefs is
  'LINE通知のカテゴリ別ON/OFFと静音時間（JST、時のみ）。既存（推しの新商品）はそのまま使い、交換の返事にも流用する。';

alter table public.line_notification_prefs enable row level security;

drop policy if exists "line_notification_prefs_select_own" on public.line_notification_prefs;
create policy "line_notification_prefs_select_own" on public.line_notification_prefs
  for select using (auth.uid() = user_id);

drop policy if exists "line_notification_prefs_upsert_own" on public.line_notification_prefs;
create policy "line_notification_prefs_upsert_own" on public.line_notification_prefs
  for insert with check (auth.uid() = user_id);

drop policy if exists "line_notification_prefs_update_own" on public.line_notification_prefs;
create policy "line_notification_prefs_update_own" on public.line_notification_prefs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. line_push_log（二重送信防止・1日あたりの上限の計算に使う送信記録）
-- ---------------------------------------------------------------------------
create table if not exists public.line_push_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('oshi_new_items', 'trade_reply', 'daily_reminder')),
  dedupe_key text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  line_user_id text not null,
  notification_id uuid,
  sent_at timestamptz not null default now(),
  unique (kind, dedupe_key)
);

comment on table public.line_push_log is
  'LINE pushの送信記録。(kind, dedupe_key)の一意制約で二重送信を防ぎ、sent_atで1人1日3通の上限を数える。本人も含め誰も直接は読めない（service_roleのみ）。';

create index if not exists line_push_log_user_sent_idx on public.line_push_log (user_id, sent_at desc);

alter table public.line_push_log enable row level security;
-- ポリシーを置かない＝authenticated/anonからは何も見えない・書けない（service_roleはRLSを経由しない）。

revoke all on public.line_push_log from authenticated, anon;

-- ---------------------------------------------------------------------------
-- 4. line-push が読む「送るべき相手」を計算するSQL（service_roleのみ）
--
--    静音時間・1日3通の上限・カテゴリ別ON/OFF・サンプルアカウント除外・友だち未確認は
--    「送ってみる」をここでまとめて判定する。edge function 側はこの結果をそのまま
--    LINE Messaging API に渡すだけにする（送信の成否は呼び出し側が line_push_log に記録する）。
-- ---------------------------------------------------------------------------

-- 推しの新商品 (oshi_new_items) と、交換の返事（承認・お断り・発送・受取・完了・催促など）
create or replace function public.line_push_digest_candidates(_limit integer default 50)
returns table (
  push_id uuid,
  kind text,
  user_id uuid,
  line_user_id text,
  title text,
  message text,
  url text
)
language sql
stable
security definer
set search_path = public
as $$
  with jst_hour as (
    select extract(hour from (now() at time zone 'Asia/Tokyo'))::int as h
  ),
  eligible_users as (
    select
      l.user_id,
      l.line_user_id,
      coalesce(np.new_goods, true) as pref_new_goods,
      coalesce(np.trade, true) as pref_trade,
      coalesce(np.quiet_start, 22) as quiet_start,
      coalesce(np.quiet_end, 8) as quiet_end
    from public.line_user_links l
    join public.profiles p on p.id = l.user_id and p.is_sample = false
    left join public.line_notification_prefs np on np.user_id = l.user_id
    where coalesce(l.notify_enabled, true) = true
      and l.friend_added is distinct from false
  ),
  not_quiet as (
    select e.* from eligible_users e, jst_hour j
    where not (
      case
        when e.quiet_start = e.quiet_end then false
        when e.quiet_start < e.quiet_end then j.h >= e.quiet_start and j.h < e.quiet_end
        else j.h >= e.quiet_start or j.h < e.quiet_end
      end
    )
  ),
  under_cap as (
    select nq.* from not_quiet nq
    where (
      select count(*) from public.line_push_log lg
      where lg.user_id = nq.user_id
        and lg.sent_at >= ((now() at time zone 'Asia/Tokyo')::date)::timestamp at time zone 'Asia/Tokyo'
    ) < 3
  )
  select
    n.id,
    (case when n.type = 'oshi_new_items' then 'oshi_new_items' else 'trade_reply' end),
    n.user_id,
    uc.line_user_id,
    n.title,
    n.message,
    coalesce(n.data->>'url', '/')
  from public.notifications n
  join under_cap uc on uc.user_id = n.user_id
  where n.created_at > now() - interval '2 days'
    and (
      (n.type = 'oshi_new_items' and uc.pref_new_goods)
      or (
        n.type in ('trade_accepted', 'trade_rejected', 'trade_cancelled', 'trade_unavailable',
                    'trade_shipped', 'trade_received', 'trade_completed', 'trade_nudge')
        and uc.pref_trade
      )
    )
    and not exists (
      select 1 from public.line_push_log lg
      where lg.kind = (case when n.type = 'oshi_new_items' then 'oshi_new_items' else 'trade_reply' end)
        and lg.dedupe_key = n.id::text
    )
  order by n.created_at asc
  limit greatest(1, least(_limit, 200));
$$;

revoke all on function public.line_push_digest_candidates(integer) from public, anon, authenticated;
grant execute on function public.line_push_digest_candidates(integer) to service_role;

-- デイリーログインの催促（当日まだ受け取っていない連携ユーザー）
create or replace function public.line_push_daily_reminder_candidates(_limit integer default 50)
returns table (
  user_id uuid,
  line_user_id text,
  cycle_day integer
)
language sql
stable
security definer
set search_path = public
as $$
  with jst_today as (
    select (now() at time zone 'Asia/Tokyo')::date as d
  ),
  jst_hour as (
    select extract(hour from (now() at time zone 'Asia/Tokyo'))::int as h
  ),
  eligible_users as (
    select
      l.user_id,
      l.line_user_id,
      coalesce(np.quiet_start, 22) as quiet_start,
      coalesce(np.quiet_end, 8) as quiet_end
    from public.line_user_links l
    join public.profiles p on p.id = l.user_id and p.is_sample = false
    left join public.line_notification_prefs np on np.user_id = l.user_id
    where coalesce(l.notify_enabled, true) = true
      and l.friend_added is distinct from false
  ),
  not_quiet as (
    select e.* from eligible_users e, jst_hour j
    where not (
      case
        when e.quiet_start = e.quiet_end then false
        when e.quiet_start < e.quiet_end then j.h >= e.quiet_start and j.h < e.quiet_end
        else j.h >= e.quiet_start or j.h < e.quiet_end
      end
    )
  ),
  under_cap as (
    select nq.* from not_quiet nq
    where (
      select count(*) from public.line_push_log lg
      where lg.user_id = nq.user_id
        and lg.sent_at >= ((now() at time zone 'Asia/Tokyo')::date)::timestamp at time zone 'Asia/Tokyo'
    ) < 3
  )
  select
    uc.user_id,
    uc.line_user_id,
    (((
      case
        when up.last_login_bonus_date = (select d from jst_today) - 1 then coalesce(up.login_streak, 0) + 1
        else 1
      end
    ) - 1) % 7) + 1
  from under_cap uc
  join public.user_points up on up.user_id = uc.user_id
  where coalesce(up.last_login_bonus_date, '1970-01-01'::date) <> (select d from jst_today)
    and not exists (
      select 1 from public.line_push_log lg
      where lg.kind = 'daily_reminder'
        and lg.dedupe_key = uc.user_id::text || ':' || (select d from jst_today)::text
    )
  limit greatest(1, least(_limit, 200));
$$;

revoke all on function public.line_push_daily_reminder_candidates(integer) from public, anon, authenticated;
grant execute on function public.line_push_daily_reminder_candidates(integer) to service_role;

-- 確かめ方（適用後、service_roleで）:
--   select * from public.line_push_digest_candidates(10);
--   select * from public.line_push_daily_reminder_candidates(10);
