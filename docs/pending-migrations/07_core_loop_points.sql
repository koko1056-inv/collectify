-- ポイントのもらい方を、アプリの本題（登録する → 眺める → コンプ → 交換）に寄せる。
--
-- いま（2026-10-16）の本番でポイントがもらえるのは、ログインボーナス・はじめてガイド・投稿/コメント/反応・
-- 交換の完了（+10）・推しフォト・なかよしLv・要望の採用・招待など。グッズを登録しても、コンプしても何も起きない
-- （登録の +1pt は 20261010200000 で止めた。クライアントから請求できる作りで、増やし放題だったため）。
-- 遊ぶほど本題が進むように、次の3つをサーバーのトリガーだけで付与する（クライアントからは請求できない）:
--
--   1) グッズの登録      +2pt  1件ごと。同じ公式グッズは一生に1回（消して入れ直しても、もう一度はもらえない）。
--                              自作のグッズは行ごと。1日10件まで（日本時間）。
--   2) コンプ            +30pt 作品・シリーズを1つそろえたとき（アプリのコンプ表示と同じ判定: 分母3以上で全部持っている）。
--                              同じ作品・シリーズは一生に1回。1日3回まで。
--   3) 交換の成立        +10pt → +30pt。1日3回まで（これまでと同じ）。
--                              加えて、同じ相手との交換は7日に1回まで（2つのアカウントで交換を繰り返して稼げないように）。
--
-- 不正への備え:
--   - 削除で取り消しはしない（取り消すと、ふつうの整理でポイントが減って嫌われる）。代わりに
--     「同じものは1回」（point_reward_claims の一意索引）と「1日の上限」（award_social_points）で抑える。
--   - 登録→削除→登録の繰り返し: 公式グッズは同じグッズで2回目が付かない。自作グッズは1日10件（20pt）で頭打ち。
--   - 小さなシリーズを「持っていないのに全部登録」してコンプ: 1日3回・同じシリーズは1回で頭打ち。
--   - claim_reward（クライアントから呼べる請求口）では、ここで足した reason は根拠の確かめ方が無いので付与されない
--     （CASE の ELSE false → 例外）。
--
-- アプリ: 「ポイントのもらい方」（/point-shop/earn）は point_rewards を読んで出すので、適用した時点で
--         「グッズを登録する +2pt」「シリーズ・作品をコンプする +30pt」が出て、交換は +30pt になる。アプリの変更は要らない。
--         1日の上限の文言はアプリ側（src/pages/PointsEarn.tsx の RULES）にもあるので、ここを変えたらそろえる。
--
-- 20261010200000_social_point_rewards.sql（award_social_points）の後に適用する（本番には適用済み）。
-- DROP は、作り直すトリガーの DROP TRIGGER IF EXISTS だけ。

-- ---------------------------------------------------------------------------
-- 1. 報酬の表
-- ---------------------------------------------------------------------------
insert into public.point_rewards (reason, points, transaction_type, description, once_per_reference, once_per_user, is_active) values
  ('item_register',   2,  'item_register',   'グッズの登録',   true, false, true),
  ('series_complete', 30, 'series_complete', 'コンプ',         true, false, true)
on conflict (reason) do nothing;

update public.point_rewards
   set points = 30, description = '交換の成立', is_active = true
 where reason = 'trade_completed';

-- ---------------------------------------------------------------------------
-- 2. 登録とコンプ（user_items への INSERT のあと、文ごとに1回）
--    まとめて登録（一度に数十件）でも、作品・シリーズごとに1回だけ数える
-- ---------------------------------------------------------------------------

-- 作品名・シリーズタグのどちらかで、そのキーに入る公式グッズのうち、本人が持っている数
create or replace function public.owned_in_series_key(_uid uuid, _key text)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select count(*)::integer from (
    select oi.id
      from public.user_items u
      join public.official_items oi on oi.id = u.official_item_id and oi.merged_into is null
     where u.user_id = _uid and lower(btrim(oi.content_name)) = _key
    union
    select oi.id
      from public.user_items u
      join public.official_items oi on oi.id = u.official_item_id and oi.merged_into is null
      join public.item_tags it on it.official_item_id = oi.id
      join public.tags t on t.id = it.tag_id and t.category = 'series'
     where u.user_id = _uid and lower(btrim(t.name)) = _key
  ) x;
$$;
revoke all on function public.owned_in_series_key(uuid, text) from public, anon, authenticated;

-- そのキーのカタログ全体の数。ただし _cap を超えたら数えるのをやめて _cap + 1 を返す
-- （大きな作品は数万件あり、コンプの判定には「持っている数より多いか」だけ分かればよい。
--   official_items_series_key_idx / tags_series_key_idx で引ける）
create or replace function public.catalog_in_series_key(_key text, _cap integer)
returns integer
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  _a integer;
  _b integer;
  _all integer;
begin
  select count(*) into _a from (
    select 1 from public.official_items oi
     where oi.merged_into is null and lower(btrim(oi.content_name)) = _key
     limit _cap + 1
  ) a;
  if _a > _cap then return _cap + 1; end if;

  select count(*) into _b from (
    select 1 from public.tags t
      join public.item_tags it on it.tag_id = t.id
      join public.official_items oi on oi.id = it.official_item_id and oi.merged_into is null
     where t.category = 'series' and lower(btrim(t.name)) = _key
     limit _cap + 1
  ) b;
  if _b > _cap then return _cap + 1; end if;

  -- どちらも小さいときだけ、重なりを除いた正しい数を出す
  select count(*) into _all from (
    select oi.id from public.official_items oi
     where oi.merged_into is null and lower(btrim(oi.content_name)) = _key
    union
    select oi.id from public.tags t
      join public.item_tags it on it.tag_id = t.id
      join public.official_items oi on oi.id = it.official_item_id and oi.merged_into is null
     where t.category = 'series' and lower(btrim(t.name)) = _key
  ) x;
  return _all;
end;
$$;
revoke all on function public.catalog_in_series_key(text, integer) from public, anon, authenticated;

create or replace function public.award_points_on_user_items_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _r record;
  _k record;
  _owned integer;
  _total integer;
begin
  -- 1) 登録: 公式グッズはそのグッズの id、自作のグッズはその行の id を「同じもの」の目印にする
  for _r in
    select n.user_id, n.id, n.official_item_id from new_rows n order by n.created_at, n.id
  loop
    perform public.award_social_points(_r.user_id, 'item_register', coalesce(_r.official_item_id, _r.id), 10);
  end loop;

  -- 2) コンプ: 今回入った公式グッズが属する作品・シリーズだけを確かめる
  for _k in
    select distinct n.user_id, lower(btrim(oi.content_name)) as key
      from new_rows n
      join public.official_items oi on oi.id = n.official_item_id and oi.merged_into is null
     where oi.content_name is not null and btrim(oi.content_name) not in ('', 'なし')
    union
    select distinct n.user_id, lower(btrim(t.name))
      from new_rows n
      join public.item_tags it on it.official_item_id = n.official_item_id
      join public.tags t on t.id = it.tag_id and t.category = 'series'
     where t.name is not null and btrim(t.name) not in ('', 'なし')
  loop
    _owned := public.owned_in_series_key(_k.user_id, _k.key);
    -- アプリの isComplete と同じ: 分母が3以上で、全部持っている
    if _owned < 3 then
      continue;
    end if;
    _total := public.catalog_in_series_key(_k.key, _owned);
    if _total >= 3 and _owned >= _total then
      perform public.award_social_points(_k.user_id, 'series_complete', md5('series_complete:' || _k.key)::uuid, 3);
    end if;
  end loop;

  return null;
end;
$$;
revoke all on function public.award_points_on_user_items_insert() from public, anon, authenticated;

drop trigger if exists award_points_on_user_items_insert on public.user_items;
create trigger award_points_on_user_items_insert
  after insert on public.user_items
  referencing new table as new_rows
  for each statement execute function public.award_points_on_user_items_insert();

-- ---------------------------------------------------------------------------
-- 3. 交換の成立（20261010200000 の置き換え）。同じ相手との交換は7日に1回まで
-- ---------------------------------------------------------------------------
create or replace function public.award_trade_points_for(_uid uuid, _partner uuid, _trade uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if _uid is null or _partner is null then return; end if;
  if exists (
    select 1
      from public.point_reward_claims c
      join public.trade_requests tr on tr.id = c.reference_id
     where c.user_id = _uid
       and c.reason = 'trade_completed'
       and c.created_at >= now() - interval '7 days'
       and tr.id <> _trade
       and (tr.sender_id = _partner or tr.receiver_id = _partner)
  ) then
    return;
  end if;
  perform public.award_social_points(_uid, 'trade_completed', _trade, 3);
end;
$$;
revoke all on function public.award_trade_points_for(uuid, uuid, uuid) from public, anon, authenticated;

create or replace function public.award_points_on_trade_completed() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform public.award_trade_points_for(new.sender_id, new.receiver_id, new.id);
    perform public.award_trade_points_for(new.receiver_id, new.sender_id, new.id);
  end if;
  return new;
end;
$$;
revoke all on function public.award_points_on_trade_completed() from public, anon, authenticated;
-- トリガー award_points_on_trade_completed（trade_requests の AFTER UPDATE）は 20261010200000 のものがそのまま新しい関数を呼ぶ
