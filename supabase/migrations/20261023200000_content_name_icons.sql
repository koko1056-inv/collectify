-- content_names のアイコン（image_url）が未設定で、かつ official_items に実物のグッズが 0 件のため
-- 推し選び画面で頭文字のプレースホルダーになっていた作品のうち、同じ作品/同じIPの画像が
-- すでにカタログ（official_items）・自前のStorage（kuji_images）にあるものだけ、それを流用して埋める。
-- 新しいロゴ・キャラクター画像は一切追加しない（著作物の無断収集はしない）。
--
-- 対象外（カタログに同IPの画像が見つからなかったもの）: いれいす, ポケモン, まじめにヤバシティ, モノパス, 初音ミク, 原神
-- → これらは official_items の取り込みが進むまで、引き続き頭文字のプレースホルダーのまま。

-- Mrs.GREEN APPLE: 表記が割れて別行になっているだけで、同じアーティストの「ミセスグリーンアップル」側に
-- 557件のグッズと表紙画像がある。そのうちの1枚（雑誌表紙）を流用する。
update content_names
set image_url = 'https://aop-emtg-jp.s3.amazonaws.com/prod/public/mga/contents/information/8ac58a460799e4bf3fb5bf16d9891f25.jpeg'
where name = 'Mrs.GREEN APPLE';

-- ガンダム: content_name が未設定のまま登録されていたガンプラの実物画像が、
-- 自前の Storage（kuji_images）に既にある。タイトル一致で流用する。
update content_names
set image_url = 'https://dmgrgzysrzzgsajwqyrh.supabase.co/storage/v1/object/public/kuji_images/e16621de-2b95-4d3b-a359-40f80cb0049f.png'
where name = 'ガンダム';
