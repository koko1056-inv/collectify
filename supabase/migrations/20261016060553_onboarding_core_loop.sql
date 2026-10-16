-- はじめてガイドを「登録する → 眺める → コンプ → 交換」の流れに沿った5項目に絞る（サーバー側）。
--
-- アプリ側（src/components/onboarding/steps.ts）は、すでに5項目だけを出している:
--   interests（推しの作品を選ぶ・新）/ first-item / favorites / goal（集めるもの・報酬なし）/ trade-offer
-- 画面から外した項目: profile / wishlist / ai-room / avatar / follow / bookmark（account は画面に出さないが付与は続ける）
--
-- これを適用するまでは:
--   - 外した項目も、達成すればサーバーが付与する（通知には以前の項目名が出る。アプリはそのように作ってある）
--   - interests は表に行が無いので付与されず、ガイドにも「+pt」は出ない
--
-- 適用すると:
--   - 外した項目は、これから達成しても付与しない（is_active = false）。
--     受け取り済みの記録（onboarding_rewards）とポイントはそのまま。行も消さない（記録が step_id を指しているため）
--   - interests（推しの作品を1つ以上選ぶ）に +10pt。すでに選んでいる人は、次にアプリを開いたときに受け取る
--   - アプリは onboarding_reward_steps を読んで額を出すので、アプリの変更は要らない
--
-- 「集めるもの」（goal）は、目標がまだ端末内（localStorage）にあり、サーバーで確かめられないので報酬を付けない。
-- 20261016060420_collection_goals を適用し、アプリの useCollectionGoals を DB 版に差し替えたあとで、
-- onboarding_step_done に goal（collection_goals に1行以上）を足し、表に行を入れる（→ 20261016061007 で足した）。
--
-- DROP 文は使っていない。何度流しても同じ結果になる。

-- 1) 有効・無効の列（無い本番ではアプリが「行があれば有効」とみなす）
alter table public.onboarding_reward_steps
  add column if not exists is_active boolean not null default true;

update public.onboarding_reward_steps
   set is_active = false
 where step_id in ('profile', 'wishlist', 'ai-room', 'avatar', 'follow', 'bookmark');

-- 2) 推しの作品を選ぶ
insert into public.onboarding_reward_steps (step_id, points, is_active)
values ('interests', 10, true)
on conflict (step_id) do update set is_active = true;

-- 3) 達成の判定に interests を足す（ほかは 20261011200000 と同じ。外した項目の判定も残す: 記録の確認に使えるように）
create or replace function public.onboarding_step_done(_uid uuid, _step_id text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select case _step_id
    when 'account' then true
    when 'interests' then exists (
      select 1 from public.profiles p
      where p.id = _uid and coalesce(array_length(p.interests, 1), 0) > 0
    )
    when 'profile' then exists (
      select 1 from public.profiles p
      where p.id = _uid
        and (coalesce(p.avatar_url, '') <> '' or coalesce(p.bio, '') <> ''
             or (coalesce(p.display_name, '') <> '' and p.display_name is distinct from p.username))
    )
    when 'first-item' then exists (select 1 from public.user_items where user_id = _uid)
    when 'favorites' then (
      select coalesce(array_length(p.favorite_item_ids, 1), 0) >= greatest(1, least(5, (select count(*) from public.user_items u where u.user_id = _uid)))
      from public.profiles p where p.id = _uid
    )
    when 'wishlist' then exists (select 1 from public.wishlists where user_id = _uid)
    when 'ai-room' then exists (select 1 from public.ai_generated_rooms where user_id = _uid)
    when 'avatar' then exists (
      select 1 from public.avatar_gallery
      where user_id = _uid and coalesce(prompt, '') not in ('プロフィール画像', 'アップロード画像')
    )
    when 'follow' then exists (select 1 from public.follows where follower_id = _uid)
    when 'trade-offer' then exists (select 1 from public.user_items where user_id = _uid and for_trade)
    when 'bookmark' then exists (select 1 from public.ai_work_bookmarks where user_id = _uid)
    else false
  end;
$$;

revoke all on function public.onboarding_step_done(uuid, text) from public, anon, authenticated;

-- 4) 1手順ずつ受け取る（交換に出したときにアプリが呼ぶ）。止めた手順は付与せず false を返す
--    （以前は表に無い手順は例外にしていた。止めた手順で例外にすると、古いアプリの呼び出しがエラーになる）
create or replace function public.claim_onboarding_reward(_step_id text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _uid uuid := auth.uid();
  _points integer;
  _active boolean;
begin
  if _uid is null then
    raise exception 'Not authenticated';
  end if;

  select points, is_active into _points, _active
    from public.onboarding_reward_steps where step_id = _step_id;
  if _points is null then
    raise exception 'Unknown onboarding step: %', _step_id;
  end if;
  if not _active then
    return false;
  end if;

  if not public.onboarding_step_done(_uid, _step_id) then
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

-- 5) 達成済みでまだもらっていない手順をまとめて付与する。有効な手順だけを見る
create or replace function public.claim_completed_onboarding_rewards()
returns table(step_id text, points integer)
language plpgsql
security definer
set search_path to 'public'
as $$
#variable_conflict use_column
declare
  _uid uuid := auth.uid();
  _s record;
begin
  if _uid is null then
    raise exception 'Not authenticated';
  end if;

  for _s in
    select r.step_id, r.points
    from public.onboarding_reward_steps r
    where r.is_active
      and not exists (
        select 1 from public.onboarding_rewards o where o.user_id = _uid and o.step_id = r.step_id
      )
  loop
    if public.onboarding_step_done(_uid, _s.step_id) then
      insert into public.onboarding_rewards (user_id, step_id, points_awarded)
      values (_uid, _s.step_id, _s.points)
      on conflict (user_id, step_id) do nothing;
      if found then
        perform public.grant_points_internal(
          _uid, _s.points, 'onboarding_reward', 'はじめのステップ達成: ' || _s.step_id, null
        );
        step_id := _s.step_id;
        points := _s.points;
        return next;
      end if;
    end if;
  end loop;
end;
$$;

revoke all on function public.claim_completed_onboarding_rewards() from public, anon;
grant execute on function public.claim_completed_onboarding_rewards() to authenticated;
