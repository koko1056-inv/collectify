-- グッズ（user_items）の並び順をユーザーが自由に入れ替えられるようにする。
-- バインダー表示・一覧（グリッド）のドラッグ並び替えを Supabase に永続化するための列。
--
-- sort_order は小さいほど先頭に来る。新しく追加したグッズはいちばん上（既存の最小値-1）に
-- 来るようにし、並び替えは「動かした1件だけ」を前後の中間値に更新すれば済むようにする
-- （fractional indexing。倍精度なので、ふつうの使い方では精度切れの心配はしなくてよい）。

alter table public.user_items
  add column if not exists sort_order double precision;

-- 既存データは「今の表示順（登録が新しい順）」のまま初期化する
with ranked as (
  select id, row_number() over (partition by user_id order by created_at desc, id) as rn
  from public.user_items
)
update public.user_items u
set sort_order = ranked.rn::double precision
from ranked
where u.id = ranked.id
  and u.sort_order is distinct from ranked.rn::double precision;

alter table public.user_items
  alter column sort_order set not null;

create index if not exists idx_user_items_user_sort_order
  on public.user_items (user_id, sort_order);

-- 新規追加時に sort_order を指定しなかったら、その人の中でいちばん上に来る値を割り振る
create or replace function public.user_items_set_default_sort_order()
returns trigger
language plpgsql
security invoker
set search_path = public
as $function$
begin
  if new.sort_order is null then
    select coalesce(min(sort_order), 1) - 1 into new.sort_order
    from public.user_items
    where user_id = new.user_id;
  end if;
  return new;
end;
$function$;

drop trigger if exists user_items_default_sort_order on public.user_items;
create trigger user_items_default_sort_order
  before insert on public.user_items
  for each row execute function public.user_items_set_default_sort_order();

-- 念のため: sort_order の書き換えも含め、グッズの追加・更新・削除は本人だけ（既存の挙動を明文化）
drop policy if exists "Users can insert their own items" on public.user_items;
create policy "Users can insert their own items"
on public.user_items
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own items" on public.user_items;
create policy "Users can update their own items"
on public.user_items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own items" on public.user_items;
create policy "Users can delete their own items"
on public.user_items
for delete
to authenticated
using (auth.uid() = user_id);
