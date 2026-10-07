-- タグ整備 フェーズA: 重複の統合・仮タグの削除（本番に未適用。手動で実行する）
--
-- 自動承認で拒否されたため、私の側では実行していません。内容を確認のうえ、
-- Supabase の SQL エディタに貼って実行してください（1回の実行で全体が1トランザクションです）。
-- supabase/migrations には置いていません（自動で適用されないようにするため）。
--
-- 事前に取得済みのバックアップ（本番にあります）:
--   _bk_20261007_tags / _item_tags / _user_item_tags / _official_items / _profile_fav_tags / _tag_aliases
--   元に戻す場合は、これらから復元できます。
--
-- やること:
--   * 同じ意味のタグ35組を統合（紐付け item_tags / user_item_tags / 別名を統合先へ移す）
--       例: 大森→大森元貴、若井→若井滉斗、藤澤→藤澤涼架、tシャツ→Tシャツ、
--           うさぎ(3)→うさぎ、ちいかわマスコット→マスコット、同名の作品タグ（作品別/無印）の統合 ほか
--   * 「なし」という仮タグ4件を、紐付けごと削除（未設定の意味で入っていたもの）
--   * profiles.favorite_tags の「tシャツ」「大森」を新しい表記へ
--   * 一括の紐付け替えで「新しいグッズにタグが付きました」通知が大量に飛ばないよう、
--     通知と usage_count のトリガーをこの処理の間だけ止め、最後に必ず戻す
--
-- 実行前: 統合対象が想定どおりかは、下の _merge の内容を select で確認できます。
-- 実行後: 末尾の select で、タグ数・紐付け数とトリガーの有効状態（すべて 'O'）を確認してください。

create temp table _merge(from_id uuid, to_id uuid) on commit drop;
insert into _merge values
 ('daf80d2d-46ed-4b1e-82ef-c1a4286ba25f','ffecadd4-6183-46a1-b64a-387356c672f7'), -- tシャツ → Tシャツ
 ('06fad01e-b002-4d91-add9-4738e64b3635','bbc047cd-928b-430d-8fb9-611cb1061f48'), -- アクリルスタンド
 ('8487c4c0-6a77-46d8-8792-c66c9199850b','934d18b9-7448-485e-aaf9-78d6ce9f6172'), -- クリアファイル
 ('44889ba3-6781-475b-827d-b02a8aec2961','a85be692-5320-4819-86f9-82962e0ed12a'), -- ステッカー
 ('c4528f08-1248-432f-b82f-2d8430e6b38a','a3a3a2f2-b02b-463d-abe8-a14db4acc154'), -- タオル
 ('5450971c-393a-4ae1-8841-956b45ef73f2','bdaf2c9d-592f-4ec1-a342-3b1ff68dcbbe'), -- ポーチ
 ('47eb4f79-5bda-4762-882c-8479c3929c1b','f35eacdd-7f45-4ce5-a429-9517b730612e'), -- バッグ
 ('be6d0d4f-e2c3-4068-8593-54d0854c8d59','55beb48d-6ead-4b01-858a-af30b7f21ed0'), -- フィギュア
 ('739b1b5e-825b-4dd8-9442-cb6cdf1d8f31','6f93396b-2698-41a0-b1b0-89614c78034f'), -- マスコット
 ('e311fb1e-0973-4627-9ddd-89bc5773bb07','6f93396b-2698-41a0-b1b0-89614c78034f'), -- マスコット
 ('1f412501-e0d6-4f11-a5e5-76e3fff17787','6f93396b-2698-41a0-b1b0-89614c78034f'), -- ちいかわマスコット → マスコット
 ('f1721a85-e9fa-44b4-a773-d177b026f9c1','63f45e98-1197-471c-afd3-148b7f959721'), -- ワッペン
 ('6b6d809a-0253-4442-b78c-9f253cb9bf6c','e52a5b5e-d567-4f81-ab5c-839ca1d5946e'), -- うさぎ（3件 → キャラのうさぎ）
 ('4fc68ed6-3a51-48a4-a5f9-80b9485e4b21','e52a5b5e-d567-4f81-ab5c-839ca1d5946e'),
 ('a0fc21d0-1822-409f-8362-328596882c73','e52a5b5e-d567-4f81-ab5c-839ca1d5946e'),
 ('ab30514a-aaeb-4b3c-98e8-2d53b16c964f','af2b2c01-2492-46c9-ad49-d09ad7053c61'), -- ちいかわ（キャラ）
 ('d8d2369c-22f1-459a-b4da-1e69327c0654','af2b2c01-2492-46c9-ad49-d09ad7053c61'),
 ('33239429-9cbf-4994-aaaa-9e547ee56944','af2b2c01-2492-46c9-ad49-d09ad7053c61'), -- ちいかわ（キャラクター名）
 ('357776f6-d146-48cc-af4e-d75db4fb14a7','a8dbf3e0-8010-4818-9a3f-364068359075'), -- ハチワレ
 ('d6401971-e7b4-4730-b42a-6fca5f9d261b','4ec8e516-f58c-4a8b-beed-2e30233d2959'), -- モモンガ
 ('a524270a-38df-452d-8025-09659a1f574d','68159166-3c15-4c32-8bde-2f5aca3f8f41'), -- らっこ → ラッコ
 ('b6a9ac47-e551-45bd-ba41-7a6bc5d7db06','8f04a220-2890-442a-872f-a6e1c10cfc41'), -- 大森 → 大森元貴
 ('ee4cc334-c3f3-405c-9c97-231dae5b95c1','1d0189be-33d9-4ebd-acea-360eb2b601fe'), -- 若井 → 若井滉斗
 ('abd59e67-9258-4a4d-8aab-154ae59fb6c5','0fe65a07-4b08-49c4-939a-d34b748d6a83'), -- 藤澤 → 藤澤涼架
 ('5a836784-2176-4edb-91d5-ea772ce8f359','9a0ea2d2-90e0-4bb0-93ea-f1d220905ef7'), -- 四季凪アキラ
 ('a3738aaa-2cb4-4110-9064-71278da86070','3512c897-5ff6-4f0f-b57c-b367bf633d8f'), -- ちいかわ寿司
 ('c42edcba-e89c-49af-85e4-e20c508253e0','b0166cb3-6d6e-4200-b18d-3b52721fb0be'), -- ホワイトラウンジ
 ('a0241233-d5a7-4546-a0ce-035234abda90','cab30069-65aa-449b-b1f9-5ddaf84e5d67'), -- Atlantis
 ('74b5a9c5-4646-4d67-b7a7-4c1ebc150c4b','adac3414-dad7-467f-a614-4c65361a8600'), -- BABEL no TOH
 ('53c68a3d-dccb-4537-bb3d-f2baa4ec2aed','599cf886-1325-455a-b01e-a714baf451bd'), -- FJORD
 ('68e8a444-1c15-4c0c-928c-4ae84493809f','c40a06ca-d40c-4e3c-8efe-251293d199f5'), -- MAGICAL 10 YEARS LANDMARK
 ('9b8214b2-8c51-47b5-a9aa-e6988363ecd9','1a647994-a18e-48ec-95fe-bf6373fd6e75'), -- Motoki's Birthday 2025
 ('2168497a-930f-47b2-b4ca-c9e85b30fb5f','fb57e698-f1e5-4fe0-8cc7-363c24d9de3e'), -- ミセスグリーンアップルa → ミセス
 ('bf1ceef9-22df-45a6-bb09-60ec173c71d6','30861f61-238f-45b0-b30d-5ffad91575ad'); -- ガチャ（type, 0件）→ ガチャ

-- 「なし」仮タグ（null×2 / character / series）
create temp table _drop(id uuid) on commit drop;
insert into _drop values
 ('873824ce-d4e7-4219-bf9d-7fbe2d709e94'),('feef9605-54d3-45e9-ad93-f7b3e747e755'),
 ('114162e2-6594-4ed2-a87d-bf7c87e46f22'),('35f34f31-8508-48cb-be6b-cdef3378e594');

set local lock_timeout = '8s';
alter table public.item_tags disable trigger trigger_notify_users_of_new_item_tag;
alter table public.item_tags disable trigger increment_tag_usage_on_item_tag;
alter table public.user_item_tags disable trigger increment_tag_usage_on_user_item_tag;

insert into public.item_tags(official_item_id, tag_id)
  select it.official_item_id, m.to_id from public.item_tags it join _merge m on m.from_id = it.tag_id
  on conflict (official_item_id, tag_id) do nothing;
insert into public.user_item_tags(user_item_id, tag_id)
  select u.user_item_id, m.to_id from public.user_item_tags u join _merge m on m.from_id = u.tag_id
  on conflict (user_item_id, tag_id) do nothing;

update public.tag_aliases a set canonical_tag_id = m.to_id from _merge m
  where a.canonical_tag_id = m.from_id
    and not exists (select 1 from public.tag_aliases b where b.alias_name = a.alias_name and b.canonical_tag_id = m.to_id);
delete from public.tag_aliases where canonical_tag_id in (select from_id from _merge union select id from _drop);
delete from public.item_tags where tag_id in (select from_id from _merge union select id from _drop);
delete from public.user_item_tags where tag_id in (select from_id from _merge union select id from _drop);
update public.tag_candidates set merged_to_tag_id = null where merged_to_tag_id in (select from_id from _merge union select id from _drop);
delete from public.tags where id in (select from_id from _merge union select id from _drop);

update public.profiles
  set favorite_tags = array_replace(array_replace(favorite_tags, 'tシャツ', 'Tシャツ'), '大森', '大森元貴')
  where favorite_tags && array['tシャツ','大森'];

alter table public.item_tags enable trigger trigger_notify_users_of_new_item_tag;
alter table public.item_tags enable trigger increment_tag_usage_on_item_tag;
alter table public.user_item_tags enable trigger increment_tag_usage_on_user_item_tag;

-- 確認: タグは 121 → 82 前後、triggers はすべて O（有効）になっていること
select (select count(*) from public.tags) as tags_after,
       (select count(*) from public.item_tags) as item_tags_after,
       (select string_agg(tgname || '=' || tgenabled, ', ') from pg_trigger
         where tgname in ('trigger_notify_users_of_new_item_tag','increment_tag_usage_on_item_tag','increment_tag_usage_on_user_item_tag')) as triggers;
