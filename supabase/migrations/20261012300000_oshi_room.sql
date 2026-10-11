-- =========================================================
-- 推しの部屋（1/2）: 部屋の器と、家具・壁紙・床・フレームの目録
--
-- 推しフォトの画面を「推しの部屋」に作り直す。推しグッズ（写真のまま）を額縁・アクスタ台などに入れて、
-- 部屋の棚・机・床・壁に飾る。部屋そのものは見た目だけで、放っておいても何も減らない（状態の変化はない）。
--
-- データ:
--   oshi_room_assets  … 置ける物の目録（key・種類・セット）。絵はアプリが描き、ここは「何が存在して、どのセットか」だけ。
--                        保存のときに、存在しない key や買っていないセットの物を弾くために使う。
--   oshi_rooms        … 1人1部屋。壁紙・床と、家具・グッズの配置（layout jsonb）。
--                        書き込みは save_oshi_room（SECURITY DEFINER）だけ。中身はそこで確かめる。
--
-- セット: 'base' は無料。それ以外は user_unlocks の 'room:<セット>' を持っている人だけが使える
--        （プロフィールの着せ替えの profiles_enforce_cosmetics と同じ考え。ショップで買う）。
-- =========================================================

CREATE TABLE IF NOT EXISTS public.oshi_room_assets (
  key text PRIMARY KEY CHECK (key ~ '^[a-z0-9]+\.[a-z0-9_]+$'),
  kind text NOT NULL CHECK (kind IN ('wallpaper', 'floor', 'furniture', 'frame')),
  set_key text NOT NULL CHECK (set_key ~ '^[a-z0-9]+$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- key の頭はセット名にそろえる（base.shelf は base セット）。目録の書き間違いを防ぐ
  CONSTRAINT oshi_room_assets_key_set CHECK (split_part(key, '.', 1) = set_key)
);

ALTER TABLE public.oshi_room_assets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'oshi_room_assets' AND policyname = 'oshi_room_assets_select_all'
  ) THEN
    CREATE POLICY oshi_room_assets_select_all ON public.oshi_room_assets FOR SELECT USING (true);
  END IF;
END $$;
REVOKE INSERT, UPDATE, DELETE ON public.oshi_room_assets FROM anon, authenticated;

-- 目録。アプリ側の src/lib/oshiRoom.ts の ROOM_ASSETS と同じ並び（scripts/test-oshi-room.mjs が突き合わせる）
INSERT INTO public.oshi_room_assets (key, kind, set_key) VALUES
  -- 無料の基本セット
  ('base.cream', 'wallpaper', 'base'),
  ('base.mint', 'wallpaper', 'base'),
  ('base.lilac', 'wallpaper', 'base'),
  ('base.wood', 'floor', 'base'),
  ('base.carpet', 'floor', 'base'),
  ('base.shelf', 'furniture', 'base'),
  ('base.desk', 'furniture', 'base'),
  ('base.rug', 'furniture', 'base'),
  ('base.plant', 'furniture', 'base'),
  ('base.lamp', 'furniture', 'base'),
  ('base.wallshelf', 'furniture', 'base'),
  ('base.frame', 'frame', 'base'),
  ('base.acrylic', 'frame', 'base'),
  ('base.badge', 'frame', 'base'),
  ('base.photo', 'frame', 'base'),
  -- 推し色セット
  ('oshi.wall', 'wallpaper', 'oshi'),
  ('oshi.floor', 'floor', 'oshi'),
  ('oshi.penlight', 'furniture', 'oshi'),
  ('oshi.garland', 'furniture', 'oshi'),
  ('oshi.ribbon', 'frame', 'oshi'),
  -- 桜セット
  ('sakura.wall', 'wallpaper', 'sakura'),
  ('sakura.tatami', 'floor', 'sakura'),
  ('sakura.tree', 'furniture', 'sakura'),
  ('sakura.branch', 'furniture', 'sakura'),
  ('sakura.frame', 'frame', 'sakura'),
  -- 夏祭りセット
  ('natsu.wall', 'wallpaper', 'natsu'),
  ('natsu.engawa', 'floor', 'natsu'),
  ('natsu.chochin', 'furniture', 'natsu'),
  ('natsu.kingyo', 'furniture', 'natsu'),
  ('natsu.uchiwa', 'frame', 'natsu'),
  -- ハロウィンセット
  ('halloween.wall', 'wallpaper', 'halloween'),
  ('halloween.floor', 'floor', 'halloween'),
  ('halloween.pumpkin', 'furniture', 'halloween'),
  ('halloween.ghost', 'furniture', 'halloween'),
  ('halloween.frame', 'frame', 'halloween'),
  -- クリスマスセット
  ('xmas.wall', 'wallpaper', 'xmas'),
  ('xmas.floor', 'floor', 'xmas'),
  ('xmas.tree', 'furniture', 'xmas'),
  ('xmas.gifts', 'furniture', 'xmas'),
  ('xmas.wreath', 'frame', 'xmas'),
  -- ゆめかわセット
  ('yumekawa.wall', 'wallpaper', 'yumekawa'),
  ('yumekawa.floor', 'floor', 'yumekawa'),
  ('yumekawa.cloud', 'furniture', 'yumekawa'),
  ('yumekawa.moon', 'furniture', 'yumekawa'),
  ('yumekawa.heart', 'frame', 'yumekawa'),
  -- きらきらショーケースセット
  ('showcase.wall', 'wallpaper', 'showcase'),
  ('showcase.floor', 'floor', 'showcase'),
  ('showcase.case', 'furniture', 'showcase'),
  ('showcase.pedestal', 'furniture', 'showcase'),
  ('showcase.gold', 'frame', 'showcase')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.oshi_rooms (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wallpaper_key text NOT NULL DEFAULT 'base.cream' REFERENCES public.oshi_room_assets(key),
  floor_key text NOT NULL DEFAULT 'base.wood' REFERENCES public.oshi_room_assets(key),
  layout jsonb NOT NULL DEFAULT '{"v":1,"furniture":[],"goods":[]}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- 大きすぎる配置は保存させない（RPC でも確かめるが、表の側でも閉じる）
  CONSTRAINT oshi_rooms_layout_size CHECK (octet_length(layout::text) <= 12000),
  CONSTRAINT oshi_rooms_layout_object CHECK (jsonb_typeof(layout) = 'object')
);

ALTER TABLE public.oshi_rooms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'oshi_rooms' AND policyname = 'oshi_rooms_select_own'
  ) THEN
    -- 本人だけが直接読める。他の人の部屋は get_profile_oshi_room（プロフィールの公開範囲で絞る）で見る
    CREATE POLICY oshi_rooms_select_own ON public.oshi_rooms FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;
-- 書き込みのポリシーは作らない。save_oshi_room だけが書く（中身を確かめてから）
REVOKE INSERT, UPDATE, DELETE ON public.oshi_rooms FROM anon, authenticated;

-- ポイントショップの商品（セットごとの買い切り）。
-- category は 'cosmetic' のまま（棚の CHECK を広げるには制約の作り直しが要るため）。
-- アプリは unlock_key が 'room:' で始まる物を「お部屋」の棚に分けて並べる。
-- 値段: カバー（1枚 80〜150pt）より、壁紙・床・家具2つ・フレームがまとまるぶん高め。季節は 180pt でそろえ、
--       推し色は手に取りやすく、ショーケースはいちばん華やかなので上に置く。
INSERT INTO public.point_shop_items
  (name, description, category, item_type, points_cost, value, is_active, icon, sort_order, unlock_key)
VALUES
  ('お部屋「推し色」',           '推し色の壁紙・床・ペンライトスタンド・ガーランドと、リボンのフレーム', 'cosmetic', 'unlock', 150, 1, true, 'home', 130, 'room:oshi'),
  ('お部屋「桜」',               '花びらの舞う壁紙・畳・桜の鉢・桜の枝と、桜のフレーム',                 'cosmetic', 'unlock', 180, 1, true, 'home', 131, 'room:sakura'),
  ('お部屋「夏祭り」',           '花火の夜空・縁側・提灯・金魚鉢と、うちわのフレーム',                   'cosmetic', 'unlock', 180, 1, true, 'home', 132, 'room:natsu'),
  ('お部屋「ハロウィン」',       'こうもりの壁紙・市松の床・かぼちゃランタン・おばけと、くものすのフレーム', 'cosmetic', 'unlock', 180, 1, true, 'home', 133, 'room:halloween'),
  ('お部屋「クリスマス」',       '雪の結晶の壁紙・赤いじゅうたん・ツリー・プレゼントと、リースのフレーム', 'cosmetic', 'unlock', 180, 1, true, 'home', 134, 'room:xmas'),
  ('お部屋「ゆめかわ」',         'パステルの壁紙と床・雲のソファ・月のランプと、ハートのフレーム',         'cosmetic', 'unlock', 200, 1, true, 'home', 135, 'room:yumekawa'),
  ('お部屋「きらきらショーケース」', 'スポットライトの壁・大理石の床・ガラスケース・台座と、金の額縁',       'cosmetic', 'unlock', 250, 1, true, 'home', 136, 'room:showcase')
ON CONFLICT (unlock_key) WHERE unlock_key IS NOT NULL DO NOTHING;
