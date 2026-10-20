-- =========================================================
-- デイリーログイン報酬を、ポイント固定から7日サイクルの豪華カレンダーにする
--
-- 以前（claim_login_bonus / login_bonus_tiers）:
--   連続ログイン日数の段階（1→10pt, 3→15pt, 7→20pt, 14→30pt, 30→50pt）でポイントだけを渡していた。
--   日付の区切りが CURRENT_DATE（サーバーのタイムゾーン、JST ではない）で、
--   UI には「連続◯日・+◯pt」のトーストが出るだけだった。
--
-- これから（claim_daily_login_reward / get_daily_login_status）:
--   7日サイクルのカレンダーで、日によってポイント・着せ替え（カバー・フレーム）・コレクション枠を渡す。
--   さらに 7・14・30 日の連続記録で大きめのお祝いを追加する。
--   日付の区切りは Asia/Tokyo（daily_ring と同じ決まり）。
--
-- 互換性:
--   user_points.login_streak / last_login_bonus_date / last_login_date は引き続きこの機能が更新する
--   （PointShop の連続表示など、既存の読み取りをそのまま使える）。
--   login_bonus_tiers テーブルと claim_login_bonus 関数は残す（過去のデータの読み取り用。
--   アプリはもう呼ばない）。
--
-- 二重受け取り防止:
--   user_points 行のロック（FOR UPDATE）に加えて、daily_login_claims に (user_id, claim_date) の
--   一意制約を持たせ、同時に来たリクエストでも1日1回しか渡らないようにする。
-- =========================================================

-- ---------------------------------------------------------------------------
-- 1. 7日サイクルのカレンダー（何日目に何をもらえるか）
-- ---------------------------------------------------------------------------
create table if not exists public.daily_login_calendar (
  cycle_day integer primary key check (cycle_day between 1 and 7),
  -- 'points' | 'cosmetic_cover' | 'cosmetic_frame' | 'points_slot'
  reward_kind text not null check (reward_kind in ('points', 'cosmetic_cover', 'cosmetic_frame', 'points_slot')),
  -- points: そのまま付与するpt。cosmetic_*: 持っていなければ着せ替えを解放、すでに全部持っていたら代わりに渡すpt
  points integer not null default 0,
  slot_bonus integer not null default 0
);

alter table public.daily_login_calendar enable row level security;
drop policy if exists "daily_login_calendar_select" on public.daily_login_calendar;
create policy "daily_login_calendar_select" on public.daily_login_calendar for select using (true);
grant select on public.daily_login_calendar to anon, authenticated;
revoke insert, update, delete on public.daily_login_calendar from anon, authenticated;

insert into public.daily_login_calendar (cycle_day, reward_kind, points, slot_bonus) values
  (1, 'points',         10, 0),
  (2, 'points',         15, 0),
  (3, 'cosmetic_cover', 20, 0),
  (4, 'points',         20, 0),
  (5, 'points',         25, 0),
  (6, 'cosmetic_frame', 20, 0),
  (7, 'points_slot',    30, 1)
on conflict (cycle_day) do update set
  reward_kind = excluded.reward_kind,
  points = excluded.points,
  slot_bonus = excluded.slot_bonus;

-- ---------------------------------------------------------------------------
-- 2. 連続記録のお祝い（サイクルとは別に、通算の連続日数で渡す）
-- ---------------------------------------------------------------------------
create table if not exists public.daily_login_milestones (
  streak_days integer primary key check (streak_days > 0),
  bonus_points integer not null default 0,
  bonus_slot integer not null default 0,
  label text not null
);

alter table public.daily_login_milestones enable row level security;
drop policy if exists "daily_login_milestones_select" on public.daily_login_milestones;
create policy "daily_login_milestones_select" on public.daily_login_milestones for select using (true);
grant select on public.daily_login_milestones to anon, authenticated;
revoke insert, update, delete on public.daily_login_milestones from anon, authenticated;

insert into public.daily_login_milestones (streak_days, bonus_points, bonus_slot, label) values
  (7,  50,  0, '7日連続ログイン'),
  (14, 80,  0, '14日連続ログイン'),
  (30, 150, 1, '30日連続ログイン')
on conflict (streak_days) do update set
  bonus_points = excluded.bonus_points,
  bonus_slot = excluded.bonus_slot,
  label = excluded.label;

-- ---------------------------------------------------------------------------
-- 3. 受け取りの記録（二重受け取り防止と履歴）
-- ---------------------------------------------------------------------------
create table if not exists public.daily_login_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  claim_date date not null,
  streak integer not null,
  cycle_day integer not null,
  reward jsonb not null default '{}'::jsonb,
  milestone integer,
  created_at timestamptz not null default now(),
  primary key (user_id, claim_date)
);

alter table public.daily_login_claims enable row level security;
drop policy if exists "daily_login_claims_select_own" on public.daily_login_claims;
create policy "daily_login_claims_select_own" on public.daily_login_claims
  for select using (auth.uid() = user_id);
grant select on public.daily_login_claims to authenticated;
revoke insert, update, delete on public.daily_login_claims from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. 今日から7日分のカレンダー（内部用。claim/get_status の両方から使う）
-- ---------------------------------------------------------------------------
create or replace function public.daily_login_week(_streak integer)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
           'offset', g.i,
           'cycle_day', c.cycle_day,
           'kind', c.reward_kind,
           'points', c.points,
           'slot_bonus', c.slot_bonus,
           'is_today', g.i = 0
         ) order by g.i), '[]'::jsonb)
    from generate_series(0, 6) as g(i)
    join public.daily_login_calendar c
      on c.cycle_day = (((_streak - 1 + g.i) % 7) + 1);
$function$;
revoke all on function public.daily_login_week(integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. 今日の状態（受け取り済みか・今日のサイクル日・この7日・連続記録の表）。副作用なし
-- ---------------------------------------------------------------------------
create or replace function public.get_daily_login_status()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  _uid uuid := auth.uid();
  _today date := (now() at time zone 'Asia/Tokyo')::date;
  _last_date date;
  _streak integer;
  _claimed boolean;
  _eff integer;
begin
  if _uid is null then
    return null;
  end if;

  select last_login_bonus_date, login_streak into _last_date, _streak
    from public.user_points where user_id = _uid;

  _claimed := (_last_date = _today);

  if _claimed then
    _eff := coalesce(_streak, 1);
  elsif _last_date = _today - 1 then
    _eff := coalesce(_streak, 0) + 1;
  else
    _eff := 1;
  end if;

  return jsonb_build_object(
    'today', _today,
    'claimed_today', _claimed,
    'streak', _eff,
    'cycle_day', ((_eff - 1) % 7) + 1,
    'week', public.daily_login_week(_eff),
    'milestones', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'streak_days', m.streak_days,
               'bonus_points', m.bonus_points,
               'bonus_slot', m.bonus_slot,
               'label', m.label
             ) order by m.streak_days), '[]'::jsonb)
        from public.daily_login_milestones m
    )
  );
end;
$function$;
revoke all on function public.get_daily_login_status() from public, anon;
grant execute on function public.get_daily_login_status() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. 受け取る（サーバー側で検証・1日1回だけ・同じトランザクションで報酬を渡す）
-- ---------------------------------------------------------------------------
create or replace function public.claim_daily_login_reward()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  _uid uuid := auth.uid();
  _today date := (now() at time zone 'Asia/Tokyo')::date;
  _last_date date;
  _streak integer;
  _cycle integer;
  _cal public.daily_login_calendar%rowtype;
  _points integer;
  _slot integer;
  _pool text[];
  _k text;
  _cosmetic text;
  _ms public.daily_login_milestones%rowtype;
  _ms_hit integer;
  _ms_points integer := 0;
  _reward jsonb;
begin
  if _uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.user_points (user_id) values (_uid) on conflict (user_id) do nothing;

  -- 行をロックして、同じ人の同時の受け取りを直列にする
  select last_login_bonus_date, login_streak into _last_date, _streak
    from public.user_points where user_id = _uid for update;

  if _last_date = _today then
    return jsonb_build_object(
      'claimed', false,
      'already_claimed', true,
      'today', _today,
      'streak', coalesce(_streak, 1),
      'cycle_day', ((coalesce(_streak, 1) - 1) % 7) + 1,
      'week', public.daily_login_week(coalesce(_streak, 1))
    );
  end if;

  -- 前日に受け取っていれば継続、そうでなければ1日目に戻る（Asia/Tokyo の日付で判定）
  if _last_date = _today - 1 then
    _streak := coalesce(_streak, 0) + 1;
  else
    _streak := 1;
  end if;
  _cycle := ((_streak - 1) % 7) + 1;

  -- 二重受け取り防止の正。行ロックに加えての安全網（(user_id, claim_date) の一意制約）
  insert into public.daily_login_claims (user_id, claim_date, streak, cycle_day)
  values (_uid, _today, _streak, _cycle)
  on conflict (user_id, claim_date) do nothing;
  if not found then
    return jsonb_build_object(
      'claimed', false,
      'already_claimed', true,
      'today', _today,
      'streak', _streak,
      'cycle_day', _cycle,
      'week', public.daily_login_week(_streak)
    );
  end if;

  select * into _cal from public.daily_login_calendar where cycle_day = _cycle;
  _points := coalesce(_cal.points, 0);
  _slot := coalesce(_cal.slot_bonus, 0);

  if _cal.reward_kind = 'cosmetic_cover' then
    _pool := array['cover:starry', 'cover:holo', 'cover:oshi', 'cover:asanoha', 'cover:stripe', 'cover:gingham'];
  elsif _cal.reward_kind = 'cosmetic_frame' then
    _pool := array['frame:gold', 'frame:holo', 'frame:oshi', 'frame:stitch'];
  else
    _pool := null;
  end if;

  if _pool is not null then
    foreach _k in array _pool loop
      if not exists (select 1 from public.user_unlocks where user_id = _uid and unlock_key = _k) then
        _cosmetic := _k;
        exit;
      end if;
    end loop;
    if _cosmetic is not null then
      insert into public.user_unlocks (user_id, unlock_key) values (_uid, _cosmetic)
      on conflict do nothing;
      -- 解放できたので、今日のpt分は渡さない（全部持っていたときだけ fallback の pt を渡す）
      _points := 0;
    end if;
  end if;

  if _slot > 0 then
    insert into public.user_limits (user_id) values (_uid) on conflict (user_id) do nothing;
    update public.user_limits
      set collection_slots = coalesce(collection_slots, 100) + _slot, updated_at = now()
      where user_id = _uid;
  end if;

  if _points > 0 then
    perform public.grant_points_internal(
      _uid, _points, 'daily_login',
      'デイリーログイン（' || _cycle || '日目）',
      md5('daily_login:' || _today::text)::uuid
    );
  end if;

  update public.user_points
    set last_login_bonus_date = _today,
        login_streak = _streak,
        last_login_date = _today,
        updated_at = now()
    where user_id = _uid;

  -- 連続記録のお祝い（7・14・30日）。サイクルの報酬とは別に渡す
  select * into _ms from public.daily_login_milestones where streak_days = _streak;
  if found then
    _ms_hit := _ms.streak_days;
    _ms_points := coalesce(_ms.bonus_points, 0);
    if _ms_points > 0 then
      perform public.grant_points_internal(
        _uid, _ms_points, 'daily_login_milestone',
        _ms.label || 'のお祝い',
        md5('daily_login_milestone:' || _today::text)::uuid
      );
    end if;
    if coalesce(_ms.bonus_slot, 0) > 0 then
      insert into public.user_limits (user_id) values (_uid) on conflict (user_id) do nothing;
      update public.user_limits
        set collection_slots = coalesce(collection_slots, 100) + _ms.bonus_slot, updated_at = now()
        where user_id = _uid;
    end if;
  end if;

  _reward := jsonb_build_object(
    'cycle_day', _cycle,
    'kind', _cal.reward_kind,
    'points', _points,
    'cosmetic', _cosmetic,
    'slot_bonus', _slot
  );
  update public.daily_login_claims
    set reward = _reward, milestone = _ms_hit
    where user_id = _uid and claim_date = _today;

  return jsonb_build_object(
    'claimed', true,
    'already_claimed', false,
    'today', _today,
    'streak', _streak,
    'cycle_day', _cycle,
    'kind', _cal.reward_kind,
    'points_awarded', _points,
    'cosmetic_unlocked', _cosmetic,
    'slot_bonus', _slot,
    'milestone', _ms_hit,
    'milestone_points', _ms_points,
    'week', public.daily_login_week(_streak)
  );
end;
$function$;

revoke all on function public.claim_daily_login_reward() from public, anon;
grant execute on function public.claim_daily_login_reward() to authenticated;
