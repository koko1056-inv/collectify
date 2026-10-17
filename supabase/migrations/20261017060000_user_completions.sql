-- コンプの記録（user_completions）。
--
-- コンプ（作品・シリーズを全部そろえた）は、これまで award_points_on_user_items_insert が +30pt を付けるだけで、
-- 「どの作品・シリーズがそろったか」はどこにも残っていなかった（ポイントの理由の参照は md5 で、名前に戻せない）。
-- そのため、アプリはコンプの瞬間を知る方法が無く、お祝いを出せなかった。
--
-- そろった瞬間に、作品・シリーズの名前と数を1行残す。アプリはまだ見ていない行（seen_at が null）を読んで
-- ポッケのお祝いを出し、見たら seen_at を入れる。実績バッジ（コンプの回数）にも使う。
--   - 1人1作品・シリーズにつき1行（あとから消して入れ直しても、2回目は残さない）
--   - ポイント（1日3回まで）が付かなかった日も、記録とお祝いは出す。points に実際に付いた点数を入れる
--   - 過去のコンプは残っていない（この時点から記録する）

create table if not exists public.user_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  label text not null,
  total integer not null,
  points integer not null default 0,
  completed_at timestamptz not null default now(),
  seen_at timestamptz,
  primary key (user_id, key)
);

alter table public.user_completions enable row level security;

create policy user_completions_select_own on public.user_completions
  for select to authenticated using (auth.uid() = user_id);

grant select on public.user_completions to authenticated;

-- 見たことにする（自分の行だけ）
create or replace function public.mark_completions_seen(_keys text[])
returns void
language sql
security definer
set search_path to 'public'
as $$
  update public.user_completions
     set seen_at = now()
   where user_id = auth.uid()
     and key = any(_keys)
     and seen_at is null;
$$;
revoke all on function public.mark_completions_seen(text[]) from public, anon;
grant execute on function public.mark_completions_seen(text[]) to authenticated;

-- 登録のトリガー: コンプしたら記録も残す（ポイントの付け方は 20261016060631 のまま）
create or replace function public.award_points_on_user_items_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  _r record;
  _k record;
  _owned integer;
  _total integer;
  _ref uuid;
  _points integer;
begin
  for _r in
    select n.user_id, n.id, n.official_item_id from new_rows n order by n.created_at, n.id
  loop
    perform public.award_social_points(_r.user_id, 'item_register', coalesce(_r.official_item_id, _r.id), 10);
  end loop;

  for _k in
    select x.user_id, x.key, min(x.label) as label
      from (
        select n.user_id, lower(btrim(oi.content_name)) as key, btrim(oi.content_name) as label
          from new_rows n
          join public.official_items oi on oi.id = n.official_item_id and oi.merged_into is null
         where oi.content_name is not null and btrim(oi.content_name) not in ('', 'なし')
        union all
        select n.user_id, lower(btrim(t.name)), btrim(t.name)
          from new_rows n
          join public.item_tags it on it.official_item_id = n.official_item_id
          join public.tags t on t.id = it.tag_id and t.category = 'series'
         where t.name is not null and btrim(t.name) not in ('', 'なし')
      ) x
     group by x.user_id, x.key
  loop
    _owned := public.owned_in_series_key(_k.user_id, _k.key);
    if _owned < 3 then
      continue;
    end if;
    _total := public.catalog_in_series_key(_k.key, _owned);
    if _total >= 3 and _owned >= _total then
      _ref := md5('series_complete:' || _k.key)::uuid;
      perform public.award_social_points(_k.user_id, 'series_complete', _ref, 3);
      -- 今回ポイントが付いたか（1日の上限や、前にもらっていたときは付かない）
      select case when exists (
               select 1 from public.point_reward_claims c
                where c.user_id = _k.user_id and c.reason = 'series_complete' and c.reference_id = _ref
                  and c.created_at >= now()
             ) then (select coalesce(points, 0) from public.point_rewards where reason = 'series_complete') else 0 end
        into _points;
      insert into public.user_completions (user_id, key, label, total, points)
      values (_k.user_id, _k.key, _k.label, _owned, _points)
      on conflict (user_id, key) do nothing;
    end if;
  end loop;

  return null;
end;
$function$;
revoke all on function public.award_points_on_user_items_insert() from public, anon, authenticated;
