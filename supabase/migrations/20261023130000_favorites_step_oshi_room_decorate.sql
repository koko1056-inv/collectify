-- ---------------------------------------------------------------------------
-- はじめてガイドの「推しグッズを飾る」(favorites): 推しグッズを選ぶ、だけでなく
-- 推しの部屋にグッズを1つ以上置いて保存した（模様替え→保存）ことも達成として認める。
--
-- 以前は favorite_item_ids（推しグッズTOP5を選ぶ）だけを見ていたが、既にグッズを
-- 持っている人は「選ぶ」より先に「飾る」（推しの部屋に置く）ことで達成したい場合がある。
-- oshi_rooms.layout の goods 配列（save_oshi_room が書く）に1件以上あれば、それも達成とする。
-- ---------------------------------------------------------------------------
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
    when 'goal' then exists (select 1 from public.collection_goals g where g.user_id = _uid)
    when 'profile' then exists (
      select 1 from public.profiles p
      where p.id = _uid
        and (coalesce(p.avatar_url, '') <> '' or coalesce(p.bio, '') <> ''
             or (coalesce(p.display_name, '') <> '' and p.display_name is distinct from p.username))
    )
    when 'first-item' then exists (select 1 from public.user_items where user_id = _uid)
    when 'favorites' then (
      (
        select coalesce(array_length(p.favorite_item_ids, 1), 0) >= greatest(1, least(5, (select count(*) from public.user_items u where u.user_id = _uid)))
        from public.profiles p where p.id = _uid
      )
      or exists (
        select 1 from public.oshi_rooms r
        where r.user_id = _uid and jsonb_array_length(coalesce(r.layout -> 'goods', '[]'::jsonb)) > 0
      )
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
