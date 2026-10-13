-- =========================================================
-- 推しの部屋: 買えるもの・もらえるものを増やす（目録とショップの商品）
--
-- 1) 新しいセット（7つ）。どれも 壁紙・床・家具2〜3・フレーム1。ショップで買う（user_unlocks の 'room:<セット>'）
-- 2) なかよしレベルの特典のセット（lv3 / lv5 / lv7 / lv10）。ショップでは売らない。
--    どれか1つの推しグッズがそのレベルに届いたとき、サーバーが user_unlocks に 'room:lvN' を入れる
--    （20261013100100_oshi_level_rewards.sql の companion_level_rewards）。
--    鍵の形をショップのセットと同じ 'room:<セット>' にそろえたので、保存の確かめ（oshi_room_require_asset）はそのまま通る
-- 3) 単品（家具・フレームを1つずつ）。解放キーは 'room:<目録の key>'（例 room:sakura.tree）。
--    セットのキー（room:sakura）とは「.」があるかで見分けられる。目録の key の形は ^[a-z0-9]+\.[a-z0-9_]+$ なので、
--    セット名と取り違えることはない。保存の確かめは同じマイグレーションの続き（…100100）で広げる
--
-- 目録はアプリ側の src/lib/oshiRoom.ts の ROOM_ASSETS と同じ並び（scripts/test-oshi-room.mjs が突き合わせる）
-- =========================================================

INSERT INTO public.oshi_room_assets (key, kind, set_key) VALUES
  -- 図書室セット
  ('library.wall', 'wallpaper', 'library'),
  ('library.floor', 'floor', 'library'),
  ('library.bookcase', 'furniture', 'library'),
  ('library.globe', 'furniture', 'library'),
  ('library.frame', 'frame', 'library'),
  -- カフェセット
  ('cafe.wall', 'wallpaper', 'cafe'),
  ('cafe.floor', 'floor', 'cafe'),
  ('cafe.counter', 'furniture', 'cafe'),
  ('cafe.sweets', 'furniture', 'cafe'),
  ('cafe.frame', 'frame', 'cafe'),
  -- 宇宙セット
  ('space.wall', 'wallpaper', 'space'),
  ('space.floor', 'floor', 'space'),
  ('space.rocket', 'furniture', 'space'),
  ('space.planet', 'furniture', 'space'),
  ('space.frame', 'frame', 'space'),
  -- 海辺セット
  ('beach.wall', 'wallpaper', 'beach'),
  ('beach.floor', 'floor', 'beach'),
  ('beach.parasol', 'furniture', 'beach'),
  ('beach.float', 'furniture', 'beach'),
  ('beach.frame', 'frame', 'beach'),
  -- ライブステージセット
  ('live.wall', 'wallpaper', 'live'),
  ('live.floor', 'floor', 'live'),
  ('live.speaker', 'furniture', 'live'),
  ('live.mic', 'furniture', 'live'),
  ('live.fans', 'furniture', 'live'),
  ('live.frame', 'frame', 'live'),
  -- 推し活祭壇セット
  ('altar.wall', 'wallpaper', 'altar'),
  ('altar.floor', 'floor', 'altar'),
  ('altar.stand', 'furniture', 'altar'),
  ('altar.balloon', 'furniture', 'altar'),
  ('altar.flower', 'furniture', 'altar'),
  ('altar.frame', 'frame', 'altar'),
  -- レトロゲームセット
  ('retro.wall', 'wallpaper', 'retro'),
  ('retro.floor', 'floor', 'retro'),
  ('retro.arcade', 'furniture', 'retro'),
  ('retro.tv', 'furniture', 'retro'),
  ('retro.frame', 'frame', 'retro'),
  -- なかよしレベルの特典（ショップでは売らない）
  ('lv3.cushion', 'furniture', 'lv3'),
  ('lv3.flower', 'frame', 'lv3'),
  ('lv5.wall', 'wallpaper', 'lv5'),
  ('lv5.trophy', 'furniture', 'lv5'),
  ('lv7.floor', 'floor', 'lv7'),
  ('lv7.chandelier', 'furniture', 'lv7'),
  ('lv10.wall', 'wallpaper', 'lv10'),
  ('lv10.arch', 'furniture', 'lv10'),
  ('lv10.crown', 'frame', 'lv10')
ON CONFLICT (key) DO NOTHING;

-- ショップの商品（セット）。category は既存のセットと同じ 'cosmetic'（棚は unlock_key の頭 room: で分ける）。
-- 値段: 既存の相場（推し色150・季節180・ゆめかわ200・ショーケース250）に合わせる。
--       家具が3つ入るライブステージと推し活祭壇は、いちばん豪華なので 300pt
INSERT INTO public.point_shop_items
  (name, description, category, item_type, points_cost, value, is_active, icon, sort_order, unlock_key)
VALUES
  ('お部屋「図書室」',       '本棚の壁紙・寄木の床・大きな本棚・地球儀と、アンティークの額縁',             'cosmetic', 'unlock', 200, 1, true, 'home', 137, 'room:library'),
  ('お部屋「カフェ」',       'レンガの壁・テラコッタの床・カフェカウンター・ケーキスタンドと、黒板のフレーム', 'cosmetic', 'unlock', 180, 1, true, 'home', 138, 'room:cafe'),
  ('お部屋「宇宙」',         '星雲の壁・宇宙船の床・ロケット・土星のランプと、丸窓のフレーム',             'cosmetic', 'unlock', 250, 1, true, 'home', 139, 'room:space'),
  ('お部屋「海辺」',         '海と空の壁・砂浜・ビーチパラソル・浮き輪と、貝殻のフレーム',                 'cosmetic', 'unlock', 180, 1, true, 'home', 140, 'room:beach'),
  ('お部屋「ライブステージ」', 'ステージの幕・光る床・スピーカー・スタンドマイク・応援うちわと、チケットのフレーム', 'cosmetic', 'unlock', 300, 1, true, 'home', 141, 'room:live'),
  ('お部屋「推し活祭壇」',   '推し色のドレープ・ふわふわの床・ひな壇・バルーン・フラワースタンドと、レースのフレーム', 'cosmetic', 'unlock', 300, 1, true, 'home', 142, 'room:altar'),
  ('お部屋「レトロゲーム」', 'ドットの壁・ネオンの床・アーケード筐体・ブラウン管テレビと、ドットのフレーム',     'cosmetic', 'unlock', 200, 1, true, 'home', 143, 'room:retro')
ON CONFLICT (unlock_key) WHERE unlock_key IS NOT NULL DO NOTHING;

-- 単品（家具・フレームを1つずつ）。セットを丸ごと買うほどではないが「これだけ欲しい」に応える。
-- 値段は 60〜100pt（セットの 1/3 ほど。2つ買うとセットに近くなるので、まとめて欲しい人はセットを選べる）。
-- 並べすぎると棚が長くなるので、各セットの「主役」の家具と、人気の出そうなフレームだけにしぼる
INSERT INTO public.point_shop_items
  (name, description, category, item_type, points_cost, value, is_active, icon, sort_order, unlock_key)
VALUES
  ('お部屋の単品「ペンライトスタンド」', '推し色のペンライトスタンド（推し色セットの家具）',   'cosmetic', 'unlock', 60,  1, true, 'home', 150, 'room:oshi.penlight'),
  ('お部屋の単品「桜の鉢」',             '花の咲いた桜の鉢（桜セットの家具）',                 'cosmetic', 'unlock', 80,  1, true, 'home', 151, 'room:sakura.tree'),
  ('お部屋の単品「金魚鉢」',             '金魚の泳ぐ金魚鉢（夏祭りセットの家具）',             'cosmetic', 'unlock', 60,  1, true, 'home', 152, 'room:natsu.kingyo'),
  ('お部屋の単品「ツリー」',             '明かりの灯るクリスマスツリー（クリスマスセットの家具）', 'cosmetic', 'unlock', 100, 1, true, 'home', 153, 'room:xmas.tree'),
  ('お部屋の単品「雲のソファ」',         'グッズを座らせられる雲のソファ（ゆめかわセットの家具）', 'cosmetic', 'unlock', 80,  1, true, 'home', 154, 'room:yumekawa.cloud'),
  ('お部屋の単品「ガラスケース」',       '3段のガラスケース（きらきらショーケースセットの家具）', 'cosmetic', 'unlock', 100, 1, true, 'home', 155, 'room:showcase.case'),
  ('お部屋の単品「大きな本棚」',         'グッズを並べられる大きな本棚（図書室セットの家具）',   'cosmetic', 'unlock', 90,  1, true, 'home', 156, 'room:library.bookcase'),
  ('お部屋の単品「ケーキスタンド」',     '2段のケーキスタンド（カフェセットの家具）',           'cosmetic', 'unlock', 60,  1, true, 'home', 157, 'room:cafe.sweets'),
  ('お部屋の単品「ロケット」',           '窓の光るロケット（宇宙セットの家具）',               'cosmetic', 'unlock', 90,  1, true, 'home', 158, 'room:space.rocket'),
  ('お部屋の単品「スタンドマイク」',     'スポットライトの当たるスタンドマイク（ライブステージセットの家具）', 'cosmetic', 'unlock', 70, 1, true, 'home', 159, 'room:live.mic'),
  ('お部屋の単品「ひな壇」',             'グッズを3段に並べられるひな壇（推し活祭壇セットの家具）', 'cosmetic', 'unlock', 100, 1, true, 'home', 160, 'room:altar.stand'),
  ('お部屋の単品「アーケード筐体」',     '画面の光るアーケード筐体（レトロゲームセットの家具）', 'cosmetic', 'unlock', 90,  1, true, 'home', 161, 'room:retro.arcade'),
  ('お部屋の単品「ハートのフレーム」',   'グッズをハートの形に飾るフレーム（ゆめかわセット）', 'cosmetic', 'unlock', 60,  1, true, 'home', 162, 'room:yumekawa.heart'),
  ('お部屋の単品「金の額縁」',           'グッズを金の額縁に飾る（きらきらショーケースセット）', 'cosmetic', 'unlock', 70,  1, true, 'home', 163, 'room:showcase.gold'),
  ('お部屋の単品「チケットのフレーム」', 'グッズをライブのチケット風に飾るフレーム（ライブステージセット）', 'cosmetic', 'unlock', 60, 1, true, 'home', 164, 'room:live.frame')
ON CONFLICT (unlock_key) WHERE unlock_key IS NOT NULL DO NOTHING;
