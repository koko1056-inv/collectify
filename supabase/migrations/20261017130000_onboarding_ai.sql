-- オンボーディングで AI を1回ためす（ポッケからのプレゼント）。
--
-- はじめての人に「AIで何ができるか」を最初に見せるため、ウェルカムのお祝いの画面で、
-- いま登録したグッズ（いちばん新しい、写真のあるグッズ）を AI で素敵な1枚にする。1人1回だけ無料。
-- 作る係は今日のミッションと同じ Edge Function（generate-mission-image の mode: "onboarding"）。
-- 作った1枚は推しフォトとして保存できる（AI で作ったことは oshi_photos.is_ai に残る）。

create table if not exists public.onboarding_ai_claims (
  user_id uuid primary key references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now()
);
alter table public.onboarding_ai_claims enable row level security;
create policy onboarding_ai_claims_select_own on public.onboarding_ai_claims
  for select to authenticated using (auth.uid() = user_id);
grant select on public.onboarding_ai_claims to authenticated;

-- ためす前に呼ぶ。グッズを決めて、1回分を使う（もう使っていたら断る）
create or replace function public.claim_onboarding_ai()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  _uid uuid := auth.uid();
  _item record;
begin
  if _uid is null then
    raise exception 'not_authenticated';
  end if;
  select u.id, u.title, coalesce(nullif(u.image, ''), oi.image) as image into _item
    from public.user_items u
    left join public.official_items oi on oi.id = u.official_item_id
   where u.user_id = _uid
     and coalesce(nullif(u.image, ''), oi.image, '') not in ('', '/placeholder.svg')
   order by u.created_at desc
   limit 1;
  if _item.id is null then
    raise exception 'no_item';
  end if;
  insert into public.onboarding_ai_claims (user_id) values (_uid)
  on conflict (user_id) do nothing;
  if not found then
    raise exception 'onboarding_ai_used';
  end if;
  return jsonb_build_object('item_id', _item.id, 'title', _item.title, 'image', _item.image);
end;
$function$;
revoke all on function public.claim_onboarding_ai() from public, anon;
grant execute on function public.claim_onboarding_ai() to authenticated;

-- 作るのに失敗したら、1回分を戻す（Edge Function からだけ呼ぶ）
create or replace function public.release_onboarding_ai(_uid uuid)
returns void
language sql
security definer
set search_path to 'public'
as $$
  delete from public.onboarding_ai_claims where user_id = _uid;
$$;
revoke all on function public.release_onboarding_ai(uuid) from public, anon, authenticated;
grant execute on function public.release_onboarding_ai(uuid) to service_role;
