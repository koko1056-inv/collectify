-- 今日のミッションを「AIで作る」でも達成できるようにする。
--
-- 写真を撮れない日（外にいる・グッズが手元にない）でも続けられるように、ミッションのグッズとお題から AI が1枚作る。
-- 作った画像は推しフォトとして保存し（AIで作ったことは is_ai で残す）、保存したらミッション達成（撮った写真と同じ扱い）。
--   - 1日2回まで無料（1回作り直せる）。ほかの用途に使えないよう、グッズとお題はサーバーが今日のミッションから決める
--   - 作る係は Edge Function generate-mission-image。回数はここ（claim_mission_ai）で数え、失敗したら戻す

alter table public.daily_missions add column if not exists ai_tries integer not null default 0;
alter table public.oshi_photos add column if not exists is_ai boolean not null default false;

-- AI で作る前に呼ぶ。今日のミッションのグッズ・お題を返し、回数を1つ使う
create or replace function public.claim_mission_ai()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  _uid uuid := auth.uid();
  _today date := (now() at time zone 'Asia/Tokyo')::date;
  _row public.daily_missions;
begin
  if _uid is null then
    raise exception 'not_authenticated';
  end if;
  select * into _row from public.daily_missions where user_id = _uid and day = _today for update;
  if _row.user_id is null or _row.user_item_id is null then
    raise exception 'no_mission';
  end if;
  if _row.completed_at is not null then
    raise exception 'mission_done';
  end if;
  if _row.ai_tries >= 2 then
    raise exception 'mission_ai_limit';
  end if;
  update public.daily_missions set ai_tries = ai_tries + 1 where user_id = _uid and day = _today;
  return (
    select jsonb_build_object(
             'item_id', u.id,
             'title', u.title,
             'image', coalesce(nullif(u.image, ''), oi.image),
             'prompt_id', _row.prompt_id,
             'tries_left', 2 - (_row.ai_tries + 1))
      from public.user_items u
      left join public.official_items oi on oi.id = u.official_item_id
     where u.id = _row.user_item_id
  );
end;
$function$;
revoke all on function public.claim_mission_ai() from public, anon;
grant execute on function public.claim_mission_ai() to authenticated;

-- 作るのに失敗したら、使った回数を戻す（Edge Function からだけ呼ぶ）
create or replace function public.release_mission_ai(_uid uuid)
returns void
language sql
security definer
set search_path to 'public'
as $$
  update public.daily_missions
     set ai_tries = greatest(ai_tries - 1, 0)
   where user_id = _uid and day = (now() at time zone 'Asia/Tokyo')::date;
$$;
revoke all on function public.release_mission_ai(uuid) from public, anon, authenticated;
grant execute on function public.release_mission_ai(uuid) to service_role;

-- 今日のミッションに、AIで作れる残りの回数と、達成した写真がAIかどうかを足す（ほかは 20261017110000 のまま）
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
    'bonus', (select points from public.point_rewards where reason = 'daily_mission'),
    'photo_is_ai', coalesce((select is_ai from public.oshi_photos where id = _row.photo_id), false),
    'ai_tries_left', greatest(2 - coalesce(_row.ai_tries, 0), 0)
  );
end;
$function$;
revoke all on function public.get_daily_mission() from public, anon;
grant execute on function public.get_daily_mission() to authenticated;
