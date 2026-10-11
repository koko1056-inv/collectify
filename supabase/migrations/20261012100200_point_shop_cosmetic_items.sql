-- =========================================================
-- 着せ替え（3/4）: 棚の整理と商品
--
-- 販売をやめるもの（何も渡せていなかった）:
--   - 「グループ作成権」「グループ上限拡張 +50人」: アプリにグループ機能が無い。
--   - 「マイルーム追加」: user_limits.room_slots を増やすが、どこでも上限として使われて
--     いなかった（ルームはいくつでも作れる）。買っても何も変わらない。
--   いずれも購入履歴は 0 件（返金の対象者はいない）。
--
-- category（ショップの棚）: 'capacity'（枠を増やす）| 'cosmetic'（着せ替え）| 'share'（シェアカード）
-- 値段: 100pt ≒ 100円。カバーはプロフィールでいちばん目に入るので高め、
--       フレームは小さいので手に取りやすく、シェアカードは一律 100pt。
-- =========================================================

UPDATE public.point_shop_items
   SET is_active = false
 WHERE item_type IN ('group_create', 'group_expand', 'room_slot');

UPDATE public.point_shop_items
   SET category = 'capacity'
 WHERE category NOT IN ('capacity', 'cosmetic', 'share');

ALTER TABLE public.point_shop_items
  ADD CONSTRAINT point_shop_items_category_check
  CHECK (category IN ('capacity', 'cosmetic', 'share'));

-- 解放アイテムは必ず解放キーを持つ。逆に、解放以外はキーを持たない
ALTER TABLE public.point_shop_items
  ADD CONSTRAINT point_shop_items_unlock_key_check
  CHECK ((item_type = 'unlock') = (unlock_key IS NOT NULL));

INSERT INTO public.point_shop_items
  (name, description, category, item_type, points_cost, value, is_active, icon, sort_order, unlock_key)
VALUES
  ('カバー「星空」',       'プロフィールのカバーを、夜空に星が散る柄に',                 'cosmetic', 'unlock', 120, 1, true, 'image', 100, 'cover:starry'),
  ('カバー「ホログラム」', '見る角度で色が移ろう、控えめなホログラムのカバー',           'cosmetic', 'unlock', 150, 1, true, 'image', 101, 'cover:holo'),
  ('カバー「推し色」',     '推しのメンバーカラーで染めるカバー。色はいつでも変えられます', 'cosmetic', 'unlock', 100, 1, true, 'image', 102, 'cover:oshi'),
  ('カバー「麻の葉」',     '和の伝統柄・麻の葉をあしらったカバー',                       'cosmetic', 'unlock', 120, 1, true, 'image', 103, 'cover:asanoha'),
  ('カバー「ストライプ」', '斜めのストライプで、すっきり見せるカバー',                   'cosmetic', 'unlock',  80, 1, true, 'image', 104, 'cover:stripe'),
  ('カバー「ギンガム」',   'やわらかなギンガムチェックのカバー',                         'cosmetic', 'unlock',  80, 1, true, 'image', 105, 'cover:gingham'),
  ('フレーム「ゴールド」', 'アイコンを金の縁で囲む',                                     'cosmetic', 'unlock', 100, 1, true, 'circle', 110, 'frame:gold'),
  ('フレーム「ホログラム」','アイコンを虹色に光る縁で囲む',                               'cosmetic', 'unlock', 100, 1, true, 'circle', 111, 'frame:holo'),
  ('フレーム「推し色」',   'アイコンを推し色の縁で囲む',                                 'cosmetic', 'unlock',  60, 1, true, 'circle', 112, 'frame:oshi'),
  ('フレーム「ステッチ」', 'アイコンをぬいぐるみのような縫い目の縁で囲む',               'cosmetic', 'unlock',  50, 1, true, 'circle', 113, 'frame:stitch'),
  ('シェアカード「夜空」', '紺の夜空に金の文字。コンプの報告を特別に',                   'share',    'unlock', 100, 1, true, 'share', 120, 'share:night'),
  ('シェアカード「和紙」', '生成りの和紙に藍と朱。落ち着いた和のカード',                 'share',    'unlock', 100, 1, true, 'share', 121, 'share:washi'),
  ('シェアカード「モノクロ」','白と黒だけの、雑誌のようなカード',                         'share',    'unlock', 100, 1, true, 'share', 122, 'share:mono')
ON CONFLICT (unlock_key) WHERE unlock_key IS NOT NULL DO NOTHING;
