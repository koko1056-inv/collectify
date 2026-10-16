-- 「予約中」: ほしい → 予約した → 持ってる の真ん中を足す。
--
-- 【なぜ】受注生産・予約は推し活でも当たり前なのに、いままでは「ほしい」と「持ってる」しかなかった。
--   予約したグッズは、届くまでの数か月どこにも記録できず、届いた日も支払う額も分からなかった。
--   （海外のコレクター向けサイト MyFigureCollection でも、持ってる/予約済み/ほしい の3段階と
--    「発売カレンダーを予約分で絞る」「いくら払うか」が、いちばん使われている機能だった）
--
-- 【形】
--   - preorders: 1人1つの公式グッズにつき1行。値段・お店は任意（支払い予定の合計に使う）
--   - 持っているグッズの2個目を予約してもよい（届いたら所持数が増える）
--   - 届いたら receive は アプリが user_items に入れてから、この行を消す（登録の上限・タグのコピーは既存の追加と同じ流れ）
--   - 見えるのは本人だけ（いくら使ったかは人に見せない）
--   - 発売日の朝に「予約していた〇〇の発売日です」と1人1通で知らせる（notify_preorder_releases）

create table if not exists public.preorders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  official_item_id uuid not null references public.official_items (id) on delete cascade,
  quantity integer not null default 1,
  price integer,
  shop text,
  release_notified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint preorders_user_item_key unique (user_id, official_item_id),
  constraint preorders_quantity_check check (quantity between 1 and 99),
  constraint preorders_price_check check (price is null or price between 0 and 10000000),
  constraint preorders_shop_check check (shop is null or char_length(shop) <= 60)
);

create index if not exists preorders_user_created_idx on public.preorders (user_id, created_at desc);
-- 発売日の通知でまだ知らせていない行を引く
create index if not exists preorders_unnotified_idx on public.preorders (official_item_id) where release_notified_at is null;

alter table public.preorders enable row level security;

create policy "preorders_select_own" on public.preorders
  for select to authenticated using (user_id = auth.uid());
create policy "preorders_insert_own" on public.preorders
  for insert to authenticated with check (user_id = auth.uid());
-- 値段・お店・個数の直し。release_notified_at はサーバーだけが書く（列の権限で外す）
create policy "preorders_update_own" on public.preorders
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "preorders_delete_own" on public.preorders
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.preorders from anon;
revoke insert, update on public.preorders from authenticated;
grant select, delete on public.preorders to authenticated;
grant insert (user_id, official_item_id, quantity, price, shop) on public.preorders to authenticated;
grant update (quantity, price, shop) on public.preorders to authenticated;

-- ---------------------------------------------------------------------------
-- 発売日の通知（毎朝 8:15 JST）。発売日が来た予約を、1人1通にまとめて知らせる
-- ---------------------------------------------------------------------------
create or replace function public.notify_preorder_releases()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_today date := (now() at time zone 'Asia/Tokyo')::date;
  v_sent integer;
begin
  -- 発売日が今日まで（3日以内）に来た、まだ知らせていない予約。
  -- 発売日を過ぎてから予約した行（日付が仮のものなど）は知らせない
  insert into public.notifications (user_id, title, message, type, data)
  select u.user_id,
         '予約していたグッズの発売日です',
         case when u.cnt > 1
              then '「' || u.title || '」など' || u.cnt || '件の発売日です。届いたらコレクションに入れましょう'
              else '「' || u.title || '」の発売日です。届いたらコレクションに入れましょう'
         end,
         'preorder_release',
         jsonb_build_object(
           'count', u.cnt,
           'item_id', u.item_id,
           'item_title', u.title,
           'image', u.image,
           'content_name', u.content_name,
           'url', '/collection?view=preorders'
         )
    from (
      select p.user_id,
             count(*)::int as cnt,
             (array_agg(oi.title order by oi.release_date desc, p.created_at))[1] as title,
             (array_agg(oi.id order by oi.release_date desc, p.created_at))[1] as item_id,
             (array_agg(oi.image order by oi.release_date desc, p.created_at))[1] as image,
             (array_agg(oi.content_name order by oi.release_date desc, p.created_at))[1] as content_name
        from public.preorders p
        join public.official_items oi on oi.id = p.official_item_id
       where p.release_notified_at is null
         and oi.release_date between v_today - 3 and v_today
         and oi.release_date >= (p.created_at at time zone 'Asia/Tokyo')::date
       group by p.user_id
    ) u;
  get diagnostics v_sent = row_count;

  update public.preorders p
     set release_notified_at = now()
    from public.official_items oi
   where oi.id = p.official_item_id
     and p.release_notified_at is null
     and oi.release_date between v_today - 3 and v_today
     and oi.release_date >= (p.created_at at time zone 'Asia/Tokyo')::date;

  return v_sent;
end;
$$;

revoke all on function public.notify_preorder_releases() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and not exists (select 1 from cron.job where jobname = 'notify-preorder-releases') then
    perform cron.schedule('notify-preorder-releases', '15 23 * * *', 'SELECT public.notify_preorder_releases()');
  end if;
end $$;
