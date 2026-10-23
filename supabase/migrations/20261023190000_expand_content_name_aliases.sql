-- 作品タグの表記ゆれ・別名を拡充する（追加のみ・冪等）。
-- 1) 薄い行（name_en / aliases が空）を埋める
-- 2) マーケティング重点作品のエイリアスを union マージで拡充
-- 3) 既存の content タグに、同じ新規エイリアスを tag_aliases として追加
-- 4) 不足している人気作品の content_names / content タグを追加（最大8件）

-- 1. name_en を埋める（既に値があれば触らない）
UPDATE public.content_names c
SET name_en = coalesce(nullif(btrim(c.name_en), ''), v.en)
FROM (VALUES
  ('VOLTACTION', 'VOLTACTION'),
  ('いれいす', 'IRREGULAR DICE'),
  ('まじめにヤバシティ', 'Mazimeni Yabacity'),
  ('モノパス', 'Monopass'),
  ('忍たま', 'Nintama Rantarō'),
  ('もちにゃみ', 'Mochinyami'),
  ('Mrs.GREEN APPLE', 'Mrs. GREEN APPLE')
) AS v(name, en)
WHERE c.name = v.name;

-- 2. aliases を union マージで拡充（既存のエイリアスは失わない）
UPDATE public.content_names c
SET aliases = (
  SELECT ARRAY(
    SELECT DISTINCT x FROM unnest(coalesce(c.aliases, '{}') || v.new_arr) AS t(x)
    WHERE nullif(btrim(x), '') IS NOT NULL
    ORDER BY 1
  )
)
FROM (VALUES
  ('ちいかわ', ARRAY['tiikawa', 'Chiikawa Pocket', 'なんか小さくてかわいいやつ', 'ちぃかわ']),
  ('ホロライブ', ARRAY['Hololive Production', 'HoloPro', 'ホロプロ', 'ホロメン', 'COVER', 'cover corp', 'hololive production']),
  ('にじさんじ', ARRAY['ANYCOLOR', 'エニカラー', 'Nijisanji EN', 'にじさんじEN', 'niji']),
  ('ミセスグリーンアップル', ARRAY['Mrs.GREEN APPLE', 'Mrs. GREEN APPLE', 'Mrs GREEN APPLE', 'mrs green apple', 'ミセグリん']),
  ('サンリオ', ARRAY['Hello Kitty', 'サンリオキャラ']),
  ('VOLTACTION', ARRAY['voltaction', 'ボルタク', 'ボルタクション']),
  ('いれいす', ARRAY['ireisu', 'IRREGULAR DICE', 'イレギュラーダイス', 'irregular dice']),
  ('まじめにヤバシティ', ARRAY['Mazimeni Yabacity', 'まじヤバ', 'yabacity', 'ヤバシティ', 'mazimeni yabacity']),
  ('モノパス', ARRAY['monopass', 'ものぱす', 'Monopass']),
  ('忍たま', ARRAY['nintama', '忍たま乱太郎', 'Nintama Rantaro', '乱太郎', 'rantaro']),
  ('もちにゃみ', ARRAY['もちにゃみちゃん']),
  -- 重複行（0件、プロダクションでは未マージ）も同じ語で検索に引っかかるようにする
  ('Mrs.GREEN APPLE', ARRAY['ミセスグリーンアップル', 'ミセス', 'mga', 'ミセグリ', 'mrs', 'ミセスグリーン', 'Mrs. GREEN APPLE', 'Mrs GREEN APPLE', 'mrs green apple', 'ミセグリん'])
) AS v(name, new_arr)
WHERE c.name = v.name;

-- 3. 不足している人気作品の content_names を追加（タグは既にあるものも多いので存在チェック）
INSERT INTO public.content_names (name, type, name_en, aliases)
SELECT v.name, v.type, v.name_en, v.aliases
FROM (VALUES
  ('ガンダム', 'anime', 'Mobile Suit Gundam', ARRAY['gundam', 'モビルスーツガンダム', 'mobile suit gundam']),
  ('ポケモン', 'game', 'Pokémon', ARRAY['pokemon', 'ポケットモンスター', 'pocket monster', 'pokémon']),
  ('初音ミク', 'music', 'Hatsune Miku', ARRAY['hatsune miku', 'miku', 'ミク', '初音みく']),
  ('原神', 'game', 'Genshin Impact', ARRAY['genshin impact', 'genshin', 'げんしん'])
) AS v(name, type, name_en, aliases)
WHERE NOT EXISTS (SELECT 1 FROM public.content_names c WHERE c.name = v.name);

-- 対応する content タグ（無ければ作成。import_official_batch と同じ display_context）
INSERT INTO public.tags (name, category, display_context)
SELECT v.name, 'content', '作品'
FROM (VALUES ('ガンダム'), ('ポケモン'), ('初音ミク'), ('原神')) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM public.tags t WHERE t.name = v.name AND t.category = 'content');

-- 4. content タグに、同じ新規エイリアスを tag_aliases として追加（検索・サジェスト用）
INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT a, t.id, NULL
FROM public.tags t
JOIN (VALUES
  ('ちいかわ', ARRAY['tiikawa', 'Chiikawa Pocket', 'なんか小さくてかわいいやつ', 'ちぃかわ']),
  ('ホロライブ', ARRAY['Hololive Production', 'HoloPro', 'ホロプロ', 'ホロメン', 'COVER', 'cover corp', 'hololive production']),
  ('にじさんじ', ARRAY['ANYCOLOR', 'エニカラー', 'Nijisanji EN', 'にじさんじEN', 'niji']),
  ('ミセスグリーンアップル', ARRAY['Mrs.GREEN APPLE', 'Mrs. GREEN APPLE', 'Mrs GREEN APPLE', 'mrs green apple', 'ミセグリん']),
  ('サンリオ', ARRAY['Hello Kitty', 'サンリオキャラ']),
  ('VOLTACTION', ARRAY['voltaction', 'ボルタク', 'ボルタクション']),
  ('いれいす', ARRAY['ireisu', 'IRREGULAR DICE', 'イレギュラーダイス', 'irregular dice']),
  ('まじめにヤバシティ', ARRAY['Mazimeni Yabacity', 'まじヤバ', 'yabacity', 'ヤバシティ', 'mazimeni yabacity']),
  ('モノパス', ARRAY['monopass', 'ものぱす', 'Monopass']),
  ('忍たま', ARRAY['nintama', '忍たま乱太郎', 'Nintama Rantaro', '乱太郎', 'rantaro']),
  ('もちにゃみ', ARRAY['もちにゃみちゃん']),
  ('ガンダム', ARRAY['gundam', 'モビルスーツガンダム', 'mobile suit gundam']),
  ('ポケモン', ARRAY['pokemon', 'ポケットモンスター', 'pocket monster', 'pokémon']),
  ('初音ミク', ARRAY['hatsune miku', 'miku', 'ミク', '初音みく']),
  ('原神', ARRAY['genshin impact', 'genshin', 'げんしん'])
) AS v(name, arr) ON v.name = t.name
CROSS JOIN LATERAL unnest(v.arr) AS a
WHERE t.category = 'content'
ON CONFLICT DO NOTHING;
