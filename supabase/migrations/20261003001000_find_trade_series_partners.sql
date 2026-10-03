-- 同じ作品を集めている交換相手を探す。
--
-- find_trade_matches は official_item_id / original_item_id の完全一致でしか
-- 突き合わせない。推し活の交換は「同じ作品の別キャラ」が中心なので、
-- この条件では現実のデータでほぼ成立しない（本番データで、仮に全件を交換可に
-- しても片想い3組・両想い0組だった）。ここは作品名で緩く寄せる。
--
-- 作品名は3経路から集める。user_items.content_name だけを見ると、
-- 本番では254件中251件が空で、拾える作品は2種類しか無かった。
-- カタログ側の content_name と series タグまで足すと、作品17種類・
-- 作品情報を持つ6人全員に平均3.7人の候補が出る（実測）。
--   1. user_items.content_name（手入力・AI読み取りが入る）
--   2. 紐付いた official_items.content_name
--   3. official_items に付いた category='series' のタグ
create or replace function public.find_trade_series_partners(_limit integer default 20)
returns table (
  partner_id uuid,
  partner_username text,
  partner_avatar_url text,
  shared_series text[],
  their_items jsonb
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with item_series as (
    -- 全ユーザーぶんの「このグッズはこの作品」を1つの形に揃える。
    -- 表示用の綴りは series_label、突き合わせは series_key を使う。
    select ui.user_id, ui.id as item_id, ui.title, ui.image,
           btrim(ui.content_name) as series_label,
           lower(btrim(ui.content_name)) as series_key,
           ui.for_trade
    from public.user_items ui
    where ui.content_name is not null and btrim(ui.content_name) <> ''
    union
    select ui.user_id, ui.id, ui.title, ui.image,
           btrim(oi.content_name), lower(btrim(oi.content_name)), ui.for_trade
    from public.user_items ui
    join public.official_items oi on oi.id = ui.official_item_id
    where oi.content_name is not null and btrim(oi.content_name) <> ''
    union
    select ui.user_id, ui.id, ui.title, ui.image,
           btrim(t.name), lower(btrim(t.name)), ui.for_trade
    from public.user_items ui
    join public.item_tags it on it.official_item_id = ui.official_item_id
    join public.tags t on t.id = it.tag_id and t.category = 'series'
    where t.name is not null and btrim(t.name) <> ''
  ),
  wish_series as (
    -- 欲しいものに入れた作品も「自分が追っている作品」に含める。
    select lower(btrim(oi.content_name)) as series_key
    from public.wishlists w
    join public.official_items oi on oi.id = w.official_item_id
    where w.user_id = auth.uid()
      and oi.content_name is not null and btrim(oi.content_name) <> ''
    union
    select lower(btrim(t.name))
    from public.wishlists w
    join public.item_tags it on it.official_item_id = w.official_item_id
    join public.tags t on t.id = it.tag_id and t.category = 'series'
    where w.user_id = auth.uid()
      and t.name is not null and btrim(t.name) <> ''
  ),
  my_series as (
    select distinct s.series_key
    from item_series s
    where s.user_id = auth.uid()
    union
    select distinct w.series_key from wish_series w
  ),
  hidden as (
    select b.blocked_id as uid from public.user_blocks b where b.blocker_id = auth.uid()
    union
    select b.blocker_id as uid from public.user_blocks b where b.blocked_id = auth.uid()
  ),
  theirs as (
    -- 同じ item_id が複数の経路で拾えるので、ここで1件にまとめる。
    select distinct s.user_id as pid, s.item_id, s.title, s.image, s.series_label
    from item_series s
    join my_series m on m.series_key = s.series_key
    where s.user_id <> auth.uid()
      and s.for_trade
      and s.user_id not in (select h.uid from hidden h)
  )
  select
    x.pid,
    pr.username,
    pr.avatar_url,
    x.series_list,
    x.items
  from (
    select
      t.pid,
      (array_agg(distinct t.series_label))[1:4] as series_list,
      jsonb_agg(distinct jsonb_build_object('id', t.item_id, 'title', t.title, 'image', t.image))
        as items,
      count(distinct t.item_id) as n
    from theirs t
    group by t.pid
  ) x
  join public.profiles pr on pr.id = x.pid
  -- 非公開プロフィールの持ち物を一覧に並べない
  where pr.privacy_level = 'public'
  order by x.n desc, pr.username
  limit greatest(1, least(coalesce(_limit, 20), 50));
$function$;

comment on function public.find_trade_series_partners(integer) is
  '同じ作品を集めていて、その作品のグッズを交換に出している相手。完全一致マッチの補完。作品名は user_items.content_name / official_items.content_name / series タグの3経路から集める。';

revoke all on function public.find_trade_series_partners(integer) from public;
grant execute on function public.find_trade_series_partners(integer) to authenticated;
