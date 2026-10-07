-- はじめてガイドの報酬は、達成していないステップには渡さない。
--
-- これまでの claim_onboarding_reward は、onboarding_reward_steps にある step_id を
-- 指定するだけで、達成していなくても全ステップ分のポイントを受け取れた
-- （ログインしていれば誰でも呼べる）。
-- 達成条件はクライアントのチェックリスト（OnboardingChecklist.tsx）の判定と同じにしてある。
-- 未達成のときは例外にせず false を返す（呼び出し側は「付与なし」として扱う）。
create or replace function public.claim_onboarding_reward(_step_id text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  _done := case _step_id
    when 'account' then true
    when 'profile' then exists (
      select 1 from public.profiles p
      where p.id = _uid
        and (coalesce(p.avatar_url, '') <> '' or coalesce(p.bio, '') <> '' or coalesce(p.display_name, '') <> '')
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
$function$;
