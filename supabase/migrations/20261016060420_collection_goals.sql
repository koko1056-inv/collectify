-- 「集めるもの」（自分で決めたコンプの目標）を DB に置く。
--
-- いまアプリは端末内（localStorage）に保存している（src/hooks/useCollectionGoals.ts）。
-- 端末を替える・ブラウザのデータを消すと目標が消えてしまうので、このテーブルに移す。
-- 移すときは useCollectionGoals の中だけを差し替える（戻り値の形は同じ）。端末内の目標は、最初の読み込みで一度だけ書き写す。
--
-- goal_key はアプリの targetKey() と同じ作り方（kind と、名前を小文字にしたものを | でつなぐ）。
--   例: 'character_type:ハチワレ|アクリルスタンド'
-- 名前（series / character / type）は、表示とカタログでの数え直しのために、そのまま持っておく。

create table if not exists public.collection_goals (
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_key text not null,
  kind text not null,
  series text,
  "character" text,
  type text,
  created_at timestamptz not null default now(),
  primary key (user_id, goal_key),
  constraint collection_goals_kind_check
    check (kind in ('series', 'character', 'character_type', 'series_character')),
  -- 種類ごとに、必要な名前がそろっているか（空の目標を作らせない）
  constraint collection_goals_fields_check check (
    (kind = 'series' and series is not null)
    or (kind = 'character' and "character" is not null)
    or (kind = 'character_type' and "character" is not null and type is not null)
    or (kind = 'series_character' and series is not null and "character" is not null)
  ),
  constraint collection_goals_key_len check (char_length(goal_key) <= 300)
);

alter table public.collection_goals enable row level security;

-- 目標は本人だけが読み書きする（他人の棚では出さない）
drop policy if exists "collection_goals_select_own" on public.collection_goals;
create policy "collection_goals_select_own" on public.collection_goals
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "collection_goals_insert_own" on public.collection_goals;
create policy "collection_goals_insert_own" on public.collection_goals
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "collection_goals_delete_own" on public.collection_goals;
create policy "collection_goals_delete_own" on public.collection_goals
  for delete to authenticated using (user_id = auth.uid());

-- 一番上に並べるので、多すぎると「目標」ではなくなる（アプリの MAX_GOALS と同じ 6）
create or replace function public.collection_goals_limit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if (select count(*) from public.collection_goals g where g.user_id = new.user_id) >= 6 then
    raise exception 'collection_goals_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$function$;

drop trigger if exists collection_goals_limit on public.collection_goals;
create trigger collection_goals_limit
  before insert on public.collection_goals
  for each row execute function public.collection_goals_limit();

revoke all on function public.collection_goals_limit() from public, anon, authenticated;
