-- カテゴリ・タグ整理（グッズタイプの分類表 + はっきりした重複・入れ違いだけのデータ整理）
--
-- 1) public.goods_type_groups: グッズタイプ（tags.category = 'type'）の小分類 → 大分類の表。
--    画面側の同じ表は src/lib/goodsTaxonomy.ts。片方だけ直さないこと（npm run test:taxonomy が突き合わせる）。
-- 2) データ整理（名前で対象を引く。何度流しても同じ結果になる＝2回目以降は何もしない）
--    a. type の表記ゆれを統合: tシャツ → Tシャツ、ブロマイド（生写真） → ブロマイド
--    b. type に入っていた「ガチャ」の紐付けを、入手方法（source）の「ガチャ」へ移す
--    c. カテゴリ未設定（category IS NULL）のグッズタイプ名タグを、同名の type タグへ統合
--    d. カテゴリ未設定のキャラ名タグ（うさぎ・ちいかわ・ハチワレ・モモンガ ほか）は、紐付いたグッズの作品タグが
--       1つに決まるときだけ、その作品のキャラタグへ統合（無ければその作品のキャラとして付け替え）。決まらなければ触らない
--    e. カテゴリ未設定の仮タグ「なし」の紐付けを外す
--    統合・仮タグの元タグは削除せず status = 'candidate' にして、タグ選択に出ないようにする（バックアップから戻せる）。
--    統合で名前が変わるもの（tシャツ 等）は tag_aliases に別名として登録する。
--
-- はっきりしないもの（ちいかわマスコット / ちいかわ寿司 / ホワイトラウンジ / ミセスグリーンアップルa、
-- type の フォトカード / ペン / ラバー / アクスタンプ / セット / その他）は触らない。
-- official_items は消さない・変えない。
--
-- 変わる件数は、本番で読み取りだけの supabase/manual/20261027_category_tag_cleanup_dryrun.sql で事前に確認できる
-- （下の「plan」「links」ブロックと同じ条件。npm run test:taxonomy が同じ文面かを確かめる）。
--
-- 元に戻す: 下の *_backup_20261027 テーブルに、変える前の行をそのまま残す（PR の「ロールバック」を参照）。
-- item_tags / user_item_tags は INSERT しない（UPDATE / DELETE だけ）ので、「新しいグッズにタグが付きました」通知は飛ばない。

set lock_timeout = '10s';

-- ---------------------------------------------------------------------------
-- 1) グッズタイプの大分類（画面の「カテゴリ」チップと同じ表）
-- ---------------------------------------------------------------------------
create table if not exists public.goods_type_groups (
  leaf_name  text primary key,           -- type タグの名前（小分類）
  group_key  text not null,              -- 大分類のキー（acrylic / badge / … / other）
  sort_order integer not null default 0  -- 大分類の並び（小さいほど先）
);

comment on table public.goods_type_groups is
  'グッズタイプ（tags.category = ''type''）の小分類 → 大分類。src/lib/goodsTaxonomy.ts と同じ内容。表に無い type タグは other 扱い。';

alter table public.goods_type_groups enable row level security;
drop policy if exists "Anyone can view goods type groups" on public.goods_type_groups;
create policy "Anyone can view goods type groups" on public.goods_type_groups for select using (true);
grant select on public.goods_type_groups to anon, authenticated;

insert into public.goods_type_groups (leaf_name, group_key, sort_order)
select v.leaf_name, v.group_key, v.sort_order
from (values
-- >>> taxonomy:begin
  ('アクリルスタンド', 'acrylic', 10), ('アクリルフォト', 'acrylic', 10), ('アクスタンプ', 'acrylic', 10),
  ('缶バッジ', 'badge', 20), ('ピンズ', 'badge', 20), ('ワッペン', 'badge', 20), ('ブローチ', 'badge', 20),
  ('ぬいぐるみ', 'plush', 30), ('マスコット', 'plush', 30),
  ('キーホルダー', 'keychain', 40), ('ラバー', 'keychain', 40),
  ('カード', 'card', 50), ('フォトカード', 'card', 50), ('ブロマイド', 'card', 50), ('ミニ色紙', 'card', 50),
  ('ポスター', 'card', 50), ('カードホルダー', 'card', 50),
  ('CD', 'media', 60), ('映像', 'media', 60), ('レコード', 'media', 60), ('アルバム', 'media', 60),
  ('雑誌', 'magazine', 70),
  ('うちわ', 'live', 80), ('ペンライト', 'live', 80), ('バンド', 'live', 80),
  ('文房具', 'stationery', 90), ('筆記具', 'stationery', 90), ('ペン', 'stationery', 90), ('ノート', 'stationery', 90),
  ('付箋', 'stationery', 90), ('クリアファイル', 'stationery', 90), ('ステッカー', 'stationery', 90),
  ('レターセット', 'stationery', 90), ('バインダー', 'stationery', 90),
  ('Tシャツ', 'fashion', 100), ('パーカー', 'fashion', 100), ('ウェア', 'fashion', 100), ('スウェット', 'fashion', 100),
  ('ジャケット', 'fashion', 100), ('ニット', 'fashion', 100), ('靴下', 'fashion', 100), ('キャップ', 'fashion', 100),
  ('スカーフ', 'fashion', 100), ('バッグ', 'fashion', 100), ('ポーチ', 'fashion', 100), ('アクセサリー', 'fashion', 100),
  ('ヘアアクセサリー', 'fashion', 100), ('ブレスレット', 'fashion', 100), ('コスメ', 'fashion', 100), ('ネイル', 'fashion', 100),
  ('インテリア', 'lifestyle', 110), ('タオル', 'lifestyle', 110), ('ハンカチ', 'lifestyle', 110), ('マグカップ', 'lifestyle', 110),
  ('タンブラー', 'lifestyle', 110), ('グラス', 'lifestyle', 110), ('コースター', 'lifestyle', 110), ('プレート', 'lifestyle', 110),
  ('キッチン用品', 'lifestyle', 110), ('日用品', 'lifestyle', 110), ('バス用品', 'lifestyle', 110), ('クッション', 'lifestyle', 110),
  ('ブランケット', 'lifestyle', 110), ('傘', 'lifestyle', 110), ('マグネット', 'lifestyle', 110), ('スノードーム', 'lifestyle', 110),
  ('ハンディファン', 'lifestyle', 110), ('ネッククーラー', 'lifestyle', 110), ('ペット用品', 'lifestyle', 110), ('ケース', 'lifestyle', 110),
  ('スマホケース', 'lifestyle', 110), ('スマホリング', 'lifestyle', 110), ('充電グッズ', 'lifestyle', 110),
  ('フィギュア', 'figure', 120), ('おもちゃ', 'figure', 120), ('プラモデル', 'figure', 120),
  ('その他', 'other', 130), ('セット', 'other', 130)
-- <<< taxonomy:end
) as v(leaf_name, group_key, sort_order)
on conflict (leaf_name) do update
  set group_key = excluded.group_key, sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- 2) 整理の対象を、変える前にまとめて決めておく（途中の変更で対象がずれないように）
-- ---------------------------------------------------------------------------
drop table if exists _b_plan;
drop table if exists _b_links;

create temp table _b_plan as
with
-- >>> plan:begin
-- 対応表（src/lib/goodsTaxonomy.ts の TYPE_TAG_MERGES / TYPE_TAG_TO_SOURCE / NULL_TAG_TO_TYPE / NULL_TAG_TO_CHARACTER / NULL_JUNK_TAGS と同じ）
type_merge_map(src_name, dst_name) as (
  values ('tシャツ', 'Tシャツ'), ('ブロマイド（生写真）', 'ブロマイド')
),
type_to_source_map(src_name, dst_name) as (
  values ('ガチャ', 'ガチャ')
),
null_type_map(src_name, dst_name) as (
  values ('アクリルスタンド', 'アクリルスタンド'), ('クリアファイル', 'クリアファイル'), ('ステッカー', 'ステッカー'),
         ('タオル', 'タオル'), ('バッグ', 'バッグ'), ('フィギュア', 'フィギュア'), ('ポーチ', 'ポーチ'),
         ('マスコット', 'マスコット'), ('ワッペン', 'ワッペン'), ('tシャツ', 'Tシャツ')
),
null_char_map(src_name, dst_name) as (
  values ('うさぎ', 'うさぎ'), ('ちいかわ', 'ちいかわ'), ('ちいかわ（キャラクター名）', 'ちいかわ'),
         ('ハチワレ', 'ハチワレ'), ('モモンガ', 'モモンガ')
),
null_junk(src_name) as (
  values ('なし')
),
-- a. type の表記ゆれ → 正しい type タグ
p_type_merge as (
  select s.id as src_id, s.name as src_name, 'merge_type_variant'::text as action,
         d.id as dst_id, null::uuid as new_content_id
  from public.tags s
  join type_merge_map m on m.src_name = s.name
  join public.tags d on d.category = 'type' and d.content_id is null and d.status = 'approved' and d.name = m.dst_name
  where s.category = 'type' and s.status = 'approved' and s.id <> d.id
),
-- b. type の「ガチャ」→ 入手方法の「ガチャ」
p_type_to_source as (
  select s.id as src_id, s.name as src_name, 'move_type_to_source'::text as action,
         d.id as dst_id, null::uuid as new_content_id
  from public.tags s
  join type_to_source_map m on m.src_name = s.name
  join public.tags d on d.category = 'source' and d.content_id is null and d.status = 'approved' and d.name = m.dst_name
  where s.category = 'type' and s.status = 'approved' and s.id <> d.id
),
-- c. カテゴリ未設定のグッズタイプ名 → 同名（または正しい表記）の type タグ
p_null_type as (
  select s.id as src_id, s.name as src_name, 'merge_null_into_type'::text as action,
         d.id as dst_id, null::uuid as new_content_id
  from public.tags s
  join null_type_map m on m.src_name = s.name
  join public.tags d on d.category = 'type' and d.content_id is null and d.status = 'approved' and d.name = m.dst_name
  where s.category is null and s.status = 'approved' and s.id <> d.id
),
-- d. カテゴリ未設定のキャラ名。紐付いたグッズの作品タグから作品を1つに決める
null_char_src as (
  select s.id, s.name, m.dst_name
  from public.tags s
  join null_char_map m on m.src_name = s.name
  where s.category is null and s.status = 'approved'
),
null_char_content as (
  select c.id as src_id,
         count(distinct it.official_item_id) as n_items,
         count(*) filter (where x.cid is null) as n_unresolved,
         count(distinct x.cid) as n_contents,
         (array_agg(distinct x.cid) filter (where x.cid is not null))[1] as cid
  from null_char_src c
  join public.item_tags it on it.tag_id = c.id
  left join lateral (
    select coalesce(ct.content_id, cn.id) as cid
    from public.item_tags it2
    join public.tags ct on ct.id = it2.tag_id and ct.category = 'content'
    left join public.content_names cn on cn.name = ct.name
    where it2.official_item_id = it.official_item_id
  ) x on true
  group by c.id
),
null_char_resolved as (
  select c.id as src_id, c.name as src_name, c.dst_name, k.cid
  from null_char_src c
  join null_char_content k on k.src_id = c.id
  where k.n_items > 0 and k.n_unresolved = 0 and k.n_contents = 1
),
p_null_char_merge as (
  select r.src_id, r.src_name, 'merge_null_into_character'::text as action,
         d.id as dst_id, null::uuid as new_content_id
  from null_char_resolved r
  join public.tags d on d.category = 'character' and d.content_id = r.cid and d.status = 'approved' and d.name = r.dst_name
  where d.id <> r.src_id
),
p_null_char_recat as (
  select r.src_id, r.src_name, 'recategorize_character'::text as action,
         null::uuid as dst_id, r.cid as new_content_id
  from null_char_resolved r
  where r.src_name = r.dst_name
    and not exists (
      select 1 from public.tags d
      where d.category = 'character' and d.content_id = r.cid and d.name = r.dst_name
    )
    and (select count(*) from null_char_resolved r2 where r2.dst_name = r.dst_name and r2.cid = r.cid) = 1
),
-- e. 仮タグ「なし」
p_junk as (
  select s.id as src_id, s.name as src_name, 'detach_junk'::text as action,
         null::uuid as dst_id, null::uuid as new_content_id
  from public.tags s
  join null_junk j on j.src_name = s.name
  where s.category is null and s.status = 'approved'
),
plan as (
  select * from p_type_merge
  union all select * from p_type_to_source
  union all select * from p_null_type
  union all select * from p_null_char_merge
  union all select * from p_null_char_recat
  union all select * from p_junk
)
-- <<< plan:end
select * from plan;

-- 紐付け（item_tags / user_item_tags）と別名の扱い。links ブロックは dry-run と同じ文面
create temp table _b_links as
with plan as (select * from _b_plan),
-- >>> links:begin
merge_plan as (
  select src_id, dst_id from plan where dst_id is not null
),
junk_plan as (
  select src_id from plan where action = 'detach_junk'
),
-- 同じグッズに統合先のタグが既に付いている／統合元が複数付いている → 1つだけ残して消す（dedupe）
it_src as (
  select it.id, it.official_item_id, mp.dst_id,
         row_number() over (partition by it.official_item_id, mp.dst_id order by it.created_at, it.id) as rn
  from public.item_tags it
  join merge_plan mp on mp.src_id = it.tag_id
),
it_class as (
  select s.id,
         case when s.rn > 1
                or exists (select 1 from public.item_tags k where k.official_item_id = s.official_item_id and k.tag_id = s.dst_id)
              then 'dedupe' else 'move' end as kind,
         s.dst_id
  from it_src s
  union all
  select it.id, 'detach_junk' as kind, null::uuid as dst_id
  from public.item_tags it
  join junk_plan j on j.src_id = it.tag_id
),
uit_src as (
  select u.id, u.user_item_id, mp.dst_id,
         row_number() over (partition by u.user_item_id, mp.dst_id order by u.created_at, u.id) as rn
  from public.user_item_tags u
  join merge_plan mp on mp.src_id = u.tag_id
),
uit_class as (
  select s.id,
         case when s.rn > 1
                or exists (select 1 from public.user_item_tags k where k.user_item_id = s.user_item_id and k.tag_id = s.dst_id)
              then 'dedupe' else 'move' end as kind,
         s.dst_id
  from uit_src s
  union all
  select u.id, 'detach_junk' as kind, null::uuid as dst_id
  from public.user_item_tags u
  join junk_plan j on j.src_id = u.tag_id
),
-- 名前が変わる統合（tシャツ → Tシャツ 等）は、元の名前を別名として登録
alias_add as (
  select distinct p.src_name as alias_name, p.dst_id as canonical_tag_id
  from plan p
  join public.tags d on d.id = p.dst_id
  where p.src_name <> d.name
    and not exists (select 1 from public.tag_aliases a where a.alias_name = p.src_name and a.canonical_tag_id = p.dst_id)
),
-- 統合元を指していた別名は統合先へ付け替える（同じ別名が既にあれば、そのまま残す）
alias_repoint as (
  select a.id, mp.dst_id
  from public.tag_aliases a
  join merge_plan mp on mp.src_id = a.canonical_tag_id
  where not exists (select 1 from public.tag_aliases b where b.alias_name = a.alias_name and b.canonical_tag_id = mp.dst_id)
    and not exists (select 1 from alias_add n where n.alias_name = a.alias_name and n.canonical_tag_id = mp.dst_id)
    and a.id = (
      select a2.id
      from public.tag_aliases a2
      join merge_plan mp2 on mp2.src_id = a2.canonical_tag_id
      where a2.alias_name = a.alias_name and mp2.dst_id = mp.dst_id
      order by a2.created_at, a2.id
      limit 1
    )
)
-- <<< links:end
select 'item_tags'::text as tbl, id, kind, dst_id, null::text as alias_name from it_class
union all
select 'user_item_tags', id, kind, dst_id, null from uit_class
union all
select 'alias_add', null::uuid, 'add', canonical_tag_id, alias_name from alias_add
union all
select 'alias_repoint', id, 'repoint', dst_id, null from alias_repoint;

-- ---------------------------------------------------------------------------
-- 3) バックアップ（変える行を、変える前の形のまま。2回目以降は同じ行を重ねて入れない）
--    一般のユーザーからは読めない（RLS あり・ポリシー無し・権限なし）
-- ---------------------------------------------------------------------------
create table if not exists public.tags_backup_20261027 as table public.tags with no data;
create table if not exists public.item_tags_backup_20261027 as table public.item_tags with no data;
create table if not exists public.user_item_tags_backup_20261027 as table public.user_item_tags with no data;
create table if not exists public.tag_aliases_backup_20261027 as table public.tag_aliases with no data;

alter table public.tags_backup_20261027 enable row level security;
alter table public.item_tags_backup_20261027 enable row level security;
alter table public.user_item_tags_backup_20261027 enable row level security;
alter table public.tag_aliases_backup_20261027 enable row level security;
revoke all on public.tags_backup_20261027 from anon, authenticated;
revoke all on public.item_tags_backup_20261027 from anon, authenticated;
revoke all on public.user_item_tags_backup_20261027 from anon, authenticated;
revoke all on public.tag_aliases_backup_20261027 from anon, authenticated;

insert into public.tags_backup_20261027
select t.* from public.tags t
where (t.id in (select src_id from _b_plan) or t.id in (select dst_id from _b_plan where dst_id is not null))
  and not exists (select 1 from public.tags_backup_20261027 b where b.id = t.id);

insert into public.item_tags_backup_20261027
select it.* from public.item_tags it
where it.id in (select id from _b_links where tbl = 'item_tags')
  and not exists (select 1 from public.item_tags_backup_20261027 b where b.id = it.id);

insert into public.user_item_tags_backup_20261027
select u.* from public.user_item_tags u
where u.id in (select id from _b_links where tbl = 'user_item_tags')
  and not exists (select 1 from public.user_item_tags_backup_20261027 b where b.id = u.id);

insert into public.tag_aliases_backup_20261027
select a.* from public.tag_aliases a
where a.id in (select id from _b_links where tbl = 'alias_repoint')
  and not exists (select 1 from public.tag_aliases_backup_20261027 b where b.id = a.id);

-- ---------------------------------------------------------------------------
-- 4) 紐付けの付け替え（UPDATE / DELETE だけ。INSERT しないので通知トリガーは動かない）
-- ---------------------------------------------------------------------------
delete from public.item_tags it
using _b_links c
where c.tbl = 'item_tags' and c.id = it.id and c.kind in ('dedupe', 'detach_junk');

update public.item_tags it
set tag_id = c.dst_id
from _b_links c
where c.tbl = 'item_tags' and c.id = it.id and c.kind = 'move';

delete from public.user_item_tags u
using _b_links c
where c.tbl = 'user_item_tags' and c.id = u.id and c.kind in ('dedupe', 'detach_junk');

update public.user_item_tags u
set tag_id = c.dst_id
from _b_links c
where c.tbl = 'user_item_tags' and c.id = u.id and c.kind = 'move';

-- ---------------------------------------------------------------------------
-- 5) 別名
-- ---------------------------------------------------------------------------
update public.tag_aliases a
set canonical_tag_id = r.dst_id
from _b_links r
where r.tbl = 'alias_repoint' and r.id = a.id;

insert into public.tag_aliases (alias_name, canonical_tag_id, created_by)
select alias_name, dst_id, null
from _b_links
where tbl = 'alias_add'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 6) タグ本体: キャラとして付け替え／統合元・仮タグは候補（candidate）に下げてタグ選択から外す
-- ---------------------------------------------------------------------------
update public.tags t
set category = 'character', content_id = p.new_content_id, display_context = 'キャラクター'
from _b_plan p
where p.src_id = t.id and p.action = 'recategorize_character' and t.category is null;

update public.tags t
set status = 'candidate'
from _b_plan p
where p.src_id = t.id
  and p.action in ('merge_type_variant', 'move_type_to_source', 'merge_null_into_type', 'merge_null_into_character', 'detach_junk')
  and t.status = 'approved';

-- usage_count を、実際の紐付け数で数え直す（20260104064359 と同じ数え方: item_tags + user_item_tags）
update public.tags t
set usage_count = a.n
from (
  select x.id,
         (select count(*) from public.item_tags where tag_id = x.id)
       + (select count(*) from public.user_item_tags where tag_id = x.id) as n
  from (
    select src_id as id from _b_plan
    union
    select dst_id from _b_plan where dst_id is not null
  ) x
) a
where a.id = t.id and t.usage_count is distinct from a.n;

drop table if exists _b_plan;
drop table if exists _b_links;

reset lock_timeout;
