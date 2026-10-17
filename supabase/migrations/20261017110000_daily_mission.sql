-- 今日のミッション（推しグッズで撮る写真のお題）。
--
-- 毎日1つ、「〇〇を空と一緒に撮ろう」のようなお題を出す。グッズは自分の推しグッズ（profiles.favorite_item_ids）から選び、
-- 推しグッズが無い人はコレクションの写真のあるグッズから選ぶ。そのグッズで推しフォトを撮ったら達成（+10pt）。
--   お題   全員同じ（日替わりで14種類を順に回す）。グッズは人ごと
--   達成   推しフォト（oshi_photos）をそのグッズで撮った日。撮るのが先でも、あとからミッションを開いたときに達成になる
-- 1日の中でグッズが変わらないよう、その日はじめて開いたときに daily_missions に残す（あとで推しグッズを入れ替えても同じ）。
--
--   get_daily_mission()   今日のミッション（お題・グッズ・達成したか・撮った写真）

create table if not exists public.daily_missions (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  user_item_id uuid references public.user_items(id) on delete set null,
  prompt_id text not null,
  completed_at timestamptz,
  photo_id uuid references public.oshi_photos(id) on delete set null,
  primary key (user_id, day)
);

alter table public.daily_missions enable row level security;
create policy daily_missions_select_own on public.daily_missions
  for select to authenticated using (auth.uid() = user_id);
grant select on public.daily_missions to authenticated;

insert into public.point_rewards (reason, points, transaction_type, description, once_per_reference, once_per_user, is_active)
values ('daily_mission', 10, 'daily_mission', '今日のミッション達成', true, false, true)
on conflict (reason) do nothing;

-- その日のお題（全員同じ。14日で一回り）
create or replace function public.daily_mission_prompt(_day date)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select (array['sky','meal','hand','window','outing','drink','flower','night','colormatch','friends','closeup','desk','book','shadow'])
         [1 + (((_day - date '2026-01-01') % 14) + 14) % 14];
$$;

-- その日のグッズ。推しグッズ → 無ければ写真のある新しいグッズ30件から、人と日で決まる1つ
create or replace function public.daily_mission_pick(_uid uuid, _day date)
returns uuid
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  _pool uuid[];
begin
  select array_agg(u.id order by u.id) into _pool
    from public.profiles p
    join public.user_items u on u.user_id = p.id and u.id = any (p.favorite_item_ids)
   where p.id = _uid;
  if coalesce(array_length(_pool, 1), 0) = 0 then
    select array_agg(x.id order by x.id) into _pool from (
      select id from public.user_items
       where user_id = _uid and coalesce(image, '') not in ('', '/placeholder.svg')
       order by created_at desc
       limit 30
    ) x;
  end if;
  if coalesce(array_length(_pool, 1), 0) = 0 then
    return null;
  end if;
  return _pool[1 + abs(hashtext(_uid::text || ':' || _day::text)) % array_length(_pool, 1)];
end;
$function$;
revoke all on function public.daily_mission_pick(uuid, date) from public, anon, authenticated;

-- 達成にする（1日1回 +10pt）。撮ったとき（トリガー）と、開いたとき（撮るのが先だった）の両方から呼ぶ
create or replace function public.complete_daily_mission(_uid uuid, _day date, _photo uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.daily_missions
     set completed_at = now(), photo_id = _photo
   where user_id = _uid and day = _day and completed_at is null;
  if not found then
    return false;
  end if;
  perform public.award_social_points(_uid, 'daily_mission', md5('daily_mission:' || _uid::text || ':' || _day::text)::uuid, 1);
  return true;
end;
$function$;
revoke all on function public.complete_daily_mission(uuid, date, uuid) from public, anon, authenticated;

create or replace function public.oshi_photos_mission_after_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.user_item_id is not null and exists (
    select 1 from public.daily_missions
     where user_id = new.user_id and day = new.taken_on and user_item_id = new.user_item_id and completed_at is null
  ) then
    perform public.complete_daily_mission(new.user_id, new.taken_on, new.id);
  end if;
  return new;
end;
$function$;
revoke all on function public.oshi_photos_mission_after_insert() from public, anon, authenticated;
create or replace trigger oshi_photos_mission_after_insert after insert on public.oshi_photos
  for each row execute function public.oshi_photos_mission_after_insert();

create or replace function public.get_daily_mission()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  _uid uuid := auth.uid();
  _today date := (now() at time zone 'Asia/Tokyo')::date;
  _row public.daily_missions;
  _item uuid;
  _photo uuid;
  _just boolean := false;
begin
  if _uid is null then
    return null;
  end if;

  select * into _row from public.daily_missions where user_id = _uid and day = _today;
  -- はじめて開いた日・グッズを手放した（消した）ときは、グッズを選び直す（達成済みなら変えない）
  if _row.user_id is null or (_row.user_item_id is null and _row.completed_at is null) then
    _item := public.daily_mission_pick(_uid, _today);
    insert into public.daily_missions as m (user_id, day, user_item_id, prompt_id)
    values (_uid, _today, _item, public.daily_mission_prompt(_today))
    on conflict (user_id, day) do update set user_item_id = excluded.user_item_id
      where m.completed_at is null;
    select * into _row from public.daily_missions where user_id = _uid and day = _today;
  end if;

  -- 先に撮っていた
  if _row.completed_at is null and _row.user_item_id is not null then
    select id into _photo from public.oshi_photos
     where user_id = _uid and taken_on = _today and user_item_id = _row.user_item_id
     order by created_at limit 1;
    if _photo is not null then
      _just := public.complete_daily_mission(_uid, _today, _photo);
      select * into _row from public.daily_missions where user_id = _uid and day = _today;
    end if;
  end if;

  return jsonb_build_object(
    'today', _today,
    'prompt_id', _row.prompt_id,
    'item', (
      select jsonb_build_object('id', u.id, 'title', u.title, 'image', coalesce(nullif(u.image, ''), oi.image),
                                'oshi', public.is_oshi_goods(_uid, u.id))
        from public.user_items u
        left join public.official_items oi on oi.id = u.official_item_id
       where u.id = _row.user_item_id
    ),
    'completed', _row.completed_at is not null,
    'just_completed', _just,
    'photo_url', (select image_url from public.oshi_photos where id = _row.photo_id),
    'bonus', (select points from public.point_rewards where reason = 'daily_mission')
  );
end;
$function$;
revoke all on function public.get_daily_mission() from public, anon;
grant execute on function public.get_daily_mission() to authenticated;
