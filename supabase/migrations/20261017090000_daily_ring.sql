-- 今日のポッケリング（毎日の目標と連続記録）。
--
-- いままでの「連続」はログインした日数だけで、アプリを開けば増えた（何もしなくても続く）。
-- Duolingo の連続記録にならい、毎日の小さな目標を3つ（集める・育てる・つながる）にして、
-- 1つでもできた日を「続いた日」、3つそろったら「リング完成」で +10pt にする。
--   集める   グッズを登録した・ほしいに入れた・予約を記録した
--   育てる   推しのお世話（なでる・みがく・写真・プレゼント）
--   つながる 投稿・コメント・リアクション・交換の申し込み・お部屋にいいね
-- 日は日本時間で区切る。できたかどうかは、それぞれの表から数える（新しい記録の仕組みは足さない）。
-- 1日休んでも途切れないように、ポイントショップで「お休みの日」（2つまで）を買っておける。休んだ日に自動で使う。
--
--   get_daily_ring()  今日の3つ・連続日数・お休みの日の数・この7日。開いたときと、何かしたあとにアプリが呼ぶ
--                     （呼ばれたときに今日と昨日の記録を daily_rings に残し、リング完成のポイントを付ける）

alter table public.user_points add column if not exists streak_freezes integer not null default 0;
-- 連続が途切れたと決めた日。そのときの休みは、あとからお休みの日を買っても埋めない
alter table public.user_points add column if not exists ring_reset_on date;

create table if not exists public.daily_rings (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  collect boolean not null default false,
  care boolean not null default false,
  social boolean not null default false,
  -- お休みの日を使った日（目標はしていないが、連続は続く）
  frozen boolean not null default false,
  completed_at timestamptz,
  primary key (user_id, day)
);

alter table public.daily_rings enable row level security;
create policy daily_rings_select_own on public.daily_rings
  for select to authenticated using (auth.uid() = user_id);
grant select on public.daily_rings to authenticated;

insert into public.point_rewards (reason, points, transaction_type, description, once_per_reference, once_per_user, is_active)
values ('daily_ring', 10, 'daily_ring', '今日のポッケリング完成', true, false, true)
on conflict (reason) do nothing;

insert into public.point_shop_items (name, description, category, item_type, points_cost, value, is_active, icon, sort_order)
select 'お休みの日', 'ポッケリングの連続が、1日休んでも途切れない（休んだ日に自動で使う・2つまで持てる）', 'capacity', 'streak_freeze', 50, 1, true, 'moon', 0
 where not exists (select 1 from public.point_shop_items where item_type = 'streak_freeze');

-- その日（日本時間）に、3つの目標をそれぞれしたか
create or replace function public.daily_ring_flags(_uid uuid, _day date, out collect boolean, out care boolean, out social boolean)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  _from timestamptz := (_day::timestamp at time zone 'Asia/Tokyo');
  _to timestamptz := ((_day + 1)::timestamp at time zone 'Asia/Tokyo');
begin
  collect := exists (select 1 from public.user_items where user_id = _uid and created_at >= _from and created_at < _to)
          or exists (select 1 from public.wishlists where user_id = _uid and created_at >= _from and created_at < _to)
          or exists (select 1 from public.preorders where user_id = _uid and created_at >= _from and created_at < _to);
  care := exists (select 1 from public.companion_goods
                   where user_id = _uid and (last_pat_on = _day or last_polish_on = _day or last_photo_on = _day))
       or exists (select 1 from public.oshi_photos where user_id = _uid and taken_on = _day)
       or exists (select 1 from public.companion_gifts where user_id = _uid and given_on = _day);
  social := exists (select 1 from public.item_posts where user_id = _uid and created_at >= _from and created_at < _to)
         or exists (select 1 from public.goods_posts where user_id = _uid and created_at >= _from and created_at < _to)
         or exists (select 1 from public.item_post_comments where user_id = _uid and created_at >= _from and created_at < _to)
         or exists (select 1 from public.post_comments where user_id = _uid and created_at >= _from and created_at < _to)
         or exists (select 1 from public.item_post_reactions where user_id = _uid and created_at >= _from and created_at < _to)
         or exists (select 1 from public.item_post_likes where user_id = _uid and created_at >= _from and created_at < _to)
         or exists (select 1 from public.post_likes where user_id = _uid and created_at >= _from and created_at < _to)
         or exists (select 1 from public.trade_requests where sender_id = _uid and created_at >= _from and created_at < _to)
         or exists (select 1 from public.oshi_room_likes where user_id = _uid and created_at >= _from and created_at < _to);
end;
$function$;
revoke all on function public.daily_ring_flags(uuid, date) from public, anon, authenticated;

create or replace function public.get_daily_ring()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  _uid uuid := auth.uid();
  _today date := (now() at time zone 'Asia/Tokyo')::date;
  _d date;
  _f record;
  _row public.daily_rings;
  _just boolean := false;
  _last date;
  _missed integer;
  _freezes integer;
  _reset date;
  _used integer := 0;
  _start date;
  _streak integer;
begin
  if _uid is null then
    return null;
  end if;

  -- 昨日の分も見直す（夜遅くにしたことを、開かないまま日付が変わった場合）。一度付いた印は消さない
  foreach _d in array array[_today - 1, _today] loop
    select * into _f from public.daily_ring_flags(_uid, _d);
    if _d = _today or _f.collect or _f.care or _f.social then
      insert into public.daily_rings as r (user_id, day, collect, care, social)
      values (_uid, _d, _f.collect, _f.care, _f.social)
      on conflict (user_id, day) do update
        set collect = r.collect or excluded.collect,
            care = r.care or excluded.care,
            social = r.social or excluded.social;
    end if;
  end loop;

  -- 3つそろったら、リング完成（1日1回 +10pt）
  select * into _row from public.daily_rings where user_id = _uid and day = _today for update;
  if _row.collect and _row.care and _row.social and _row.completed_at is null then
    update public.daily_rings set completed_at = now() where user_id = _uid and day = _today;
    perform public.award_social_points(_uid, 'daily_ring', md5('daily_ring:' || _today::text)::uuid, 1);
    _just := true;
  end if;

  -- 休んだ日があれば、お休みの日で埋める（足りないときは使わない＝連続は途切れる）
  insert into public.user_points (user_id) values (_uid) on conflict (user_id) do nothing;
  select streak_freezes, ring_reset_on into _freezes, _reset from public.user_points where user_id = _uid for update;
  select max(day) into _last from public.daily_rings
   where user_id = _uid and day < _today and (collect or care or social or frozen);
  if _last is not null and _last < _today - 1 and (_reset is null or _reset <= _last) then
    _missed := (_today - 1) - _last;
    if _missed > coalesce(_freezes, 0) then
      -- 足りない: ここで途切れたことにする（あとから買って埋める抜け道を作らない）
      update public.user_points set ring_reset_on = _today where user_id = _uid;
    else
      insert into public.daily_rings (user_id, day, frozen)
      select _uid, g::date, true from generate_series(_last + 1, _today - 1, interval '1 day') g
      on conflict (user_id, day) do update set frozen = true;
      update public.user_points set streak_freezes = streak_freezes - _missed where user_id = _uid;
      _freezes := _freezes - _missed;
      _used := _missed;
    end if;
  end if;

  -- 連続: 今日できていれば今日から、まだなら昨日から数える（今日はまだ途切れていない）
  _start := case when exists (
    select 1 from public.daily_rings where user_id = _uid and day = _today and (collect or care or social)
  ) then _today else _today - 1 end;
  select count(*) into _streak from (
    select day, row_number() over (order by day desc) as rn
      from public.daily_rings
     where user_id = _uid and day <= _start and (collect or care or social or frozen)
  ) x where x.day = _start - (x.rn - 1)::integer;

  select * into _row from public.daily_rings where user_id = _uid and day = _today;
  return jsonb_build_object(
    'today', _today,
    'collect', _row.collect,
    'care', _row.care,
    'social', _row.social,
    'completed', _row.completed_at is not null,
    'just_completed', _just,
    'streak', _streak,
    'freezes', coalesce(_freezes, 0),
    'freezes_used', _used,
    'bonus', (select points from public.point_rewards where reason = 'daily_ring'),
    'week', (
      select jsonb_agg(jsonb_build_object(
               'day', g::date,
               'done', coalesce(r.collect or r.care or r.social, false),
               'full', coalesce(r.collect and r.care and r.social, false),
               'frozen', coalesce(r.frozen, false))
             order by g)
        from generate_series(_today - 6, _today, interval '1 day') g
        left join public.daily_rings r on r.user_id = _uid and r.day = g::date
    )
  );
end;
$function$;
revoke all on function public.get_daily_ring() from public, anon;
grant execute on function public.get_daily_ring() to authenticated;

-- ポイントショップ: お休みの日（streak_freeze）を買えるようにする（ほかは 20261012100100 のまま）
CREATE OR REPLACE FUNCTION public.purchase_shop_item(_shop_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _item RECORD;
  _current_points integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _item FROM public.point_shop_items
   WHERE id = _shop_item_id AND is_active;
  IF _item IS NULL THEN
    RAISE EXCEPTION 'Shop item not found';
  END IF;

  -- 渡し方を知らない商品は、ポイントを引く前に断る
  IF _item.item_type NOT IN ('collection_slots', 'custom_tags', 'unlock', 'streak_freeze') THEN
    RAISE EXCEPTION 'Unsupported shop item type: %', _item.item_type;
  END IF;

  -- 残高の行をロックして、同じ人の同時購入を直列にする（二重購入・二重消費を防ぐ）
  SELECT COALESCE(total_points, 0) INTO _current_points
    FROM public.user_points WHERE user_id = _uid FOR UPDATE;

  -- 買い切りの解放は、持っていたら引く前に断る
  IF _item.item_type = 'unlock' AND EXISTS (
    SELECT 1 FROM public.user_unlocks
     WHERE user_id = _uid AND unlock_key = _item.unlock_key
  ) THEN
    RAISE EXCEPTION 'Already owned';
  END IF;

  -- お休みの日は持てる数に上限がある（使い切ってから買い足す）
  IF _item.item_type = 'streak_freeze' AND EXISTS (
    SELECT 1 FROM public.user_points
     WHERE user_id = _uid AND streak_freezes + COALESCE(_item.value, 1) > 2
  ) THEN
    RAISE EXCEPTION 'Freeze limit';
  END IF;

  IF COALESCE(_current_points, 0) < _item.points_cost THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  IF _item.item_type = 'collection_slots' THEN
    INSERT INTO public.user_limits (user_id) VALUES (_uid)
    ON CONFLICT (user_id) DO NOTHING;
    UPDATE public.user_limits
      SET collection_slots = COALESCE(collection_slots, 100) + _item.value, updated_at = now()
      WHERE user_id = _uid;
  ELSIF _item.item_type = 'custom_tags' THEN
    INSERT INTO public.user_limits (user_id) VALUES (_uid)
    ON CONFLICT (user_id) DO NOTHING;
    UPDATE public.user_limits
      SET custom_tag_slots = COALESCE(custom_tag_slots, 10) + _item.value, updated_at = now()
      WHERE user_id = _uid;
  ELSIF _item.item_type = 'unlock' THEN
    INSERT INTO public.user_unlocks (user_id, unlock_key)
    VALUES (_uid, _item.unlock_key);
  ELSIF _item.item_type = 'streak_freeze' THEN
    UPDATE public.user_points
      SET streak_freezes = streak_freezes + COALESCE(_item.value, 1)
      WHERE user_id = _uid;
  END IF;

  UPDATE public.user_points
    SET total_points = total_points - _item.points_cost, updated_at = now()
    WHERE user_id = _uid;

  INSERT INTO public.point_transactions
    (user_id, points, transaction_type, description, reference_id)
  VALUES
    (_uid, -_item.points_cost, 'shop_purchase', _item.name || 'を購入', _item.id);

  INSERT INTO public.user_point_purchases (user_id, shop_item_id, points_spent)
  VALUES (_uid, _item.id, _item.points_cost);

  RETURN jsonb_build_object(
    'success', true,
    'new_points', _current_points - _item.points_cost,
    'item_name', _item.name,
    'unlock_key', _item.unlock_key
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.purchase_shop_item(uuid) TO authenticated;
