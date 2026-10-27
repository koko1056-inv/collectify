-- カテゴリ・タグ整理（supabase/migrations/20261027220000_category_tag_cleanup.sql）の dry-run。
--
-- 読み取りだけ（SELECT のみ。書き込み・一時テーブル・DO ブロックなし）。本番の読み取り専用接続でそのまま流せる。
-- 「plan」「links」ブロックはマイグレーションと同じ文面（npm run test:taxonomy が一致を確かめる）。
--
-- 1つ目の SELECT: 処理ごとの件数（マイグレーションが変える行数そのもの）
--   tags.*                 … 対象タグの数（処理の種類ごと）
--   item_tags.move         … 統合先へ付け替える紐付け
--   item_tags.dedupe       … 統合先が既に付いている等で消す紐付け（バックアップに残る）
--   item_tags.detach_junk  … 仮タグ「なし」の外す紐付け
--   user_item_tags.*       … ユーザーのグッズ側（同じ考え方）
--   tag_aliases.add        … 追加する別名 / tag_aliases.repoint … 統合先へ付け替える別名
--   tags.retired           … status を candidate に下げるタグ
-- 2つ目の SELECT: 対象タグの一覧（統合先・付け替え先の作品つき）
-- 3つ目の SELECT: カテゴリ未設定のまま残るタグ（触らないもの）

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
,
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
select 'tags.' || action as action, count(*)::bigint as n from plan group by action
union all
select 'item_tags.' || kind, count(*) from it_class group by kind
union all
select 'user_item_tags.' || kind, count(*) from uit_class group by kind
union all
select 'tag_aliases.add', count(*) from alias_add
union all
select 'tag_aliases.repoint', count(*) from alias_repoint
union all
select 'tags.retired', count(*) from plan where action <> 'recategorize_character'
order by 1;

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
select p.action, p.src_name, p.src_id,
       d.name as dst_name, d.category as dst_category, coalesce(dcn.name, ncn.name) as content_name, p.dst_id,
       (select count(*) from public.item_tags it where it.tag_id = p.src_id) as item_links,
       (select count(*) from public.user_item_tags u where u.tag_id = p.src_id) as user_item_links
from plan p
left join public.tags d on d.id = p.dst_id
left join public.content_names dcn on dcn.id = d.content_id
left join public.content_names ncn on ncn.id = p.new_content_id
order by p.action, p.src_name;

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
select t.id, t.name, t.display_context, t.status,
       (select count(*) from public.item_tags it where it.tag_id = t.id) as item_links,
       (select count(*) from public.user_item_tags u where u.tag_id = t.id) as user_item_links
from public.tags t
where t.category is null
  and not exists (select 1 from plan p where p.src_id = t.id)
order by item_links desc, t.name;
