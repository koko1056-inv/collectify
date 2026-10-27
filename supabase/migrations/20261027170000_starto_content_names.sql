-- STARTO ENTERTAINMENT（旧ジャニーズ）の15グループを作品（content_names）として追加する（追加のみ・冪等）。
-- 1) content_names（type='anime'）と同名の content タグを、無ければ作る（import_official_batch と同じ display_context）
-- 2) name_en を埋める（既に値があれば触らない）
-- 3) aliases を union マージで拡充（既存のエイリアスは失わない）
-- 4) content タグに同じエイリアスを tag_aliases として追加（検索・サジェスト用）
-- エイリアスはグループ固有の読み・ローマ字・愛称・旧名だけ。メンバー名や「ジャニーズ」「STARTO」などの総称は入れない。
-- 旧名で出た作品（Sexy Zone / 関ジャニ∞ / ジャニーズWEST）は現在の名前の作品に入れ、旧名をエイリアスにする。

DROP TABLE IF EXISTS _starto_groups;
CREATE TEMP TABLE _starto_groups (name text PRIMARY KEY, name_en text, aliases text[]);

INSERT INTO _starto_groups (name, name_en, aliases) VALUES
  ('Snow Man', 'Snow Man', ARRAY['スノーマン', 'すのーまん', 'スノ', 'すの', 'snowman', 'SnowMan', 'snow man']),
  ('SixTONES', 'SixTONES', ARRAY['ストーンズ', 'すとーんず', 'スト', 'sixtones', 'SIXTONES']),
  ('なにわ男子', 'Naniwa Danshi', ARRAY['なにわだんし', 'ナニワダンシ', 'なにわ', 'Naniwa Danshi', 'naniwa danshi', 'naniwadanshi']),
  ('King & Prince', 'King & Prince', ARRAY['キングアンドプリンス', 'キンプリ', 'きんぷり', 'King and Prince', 'king & prince', 'kingandprince', 'KinPri']),
  ('Travis Japan', 'Travis Japan', ARRAY['トラビスジャパン', 'トラジャ', 'とらじゃ', 'travis japan', 'travisjapan']),
  ('timelesz', 'timelesz', ARRAY['タイムレス', 'たいむれす', 'Sexy Zone', 'セクシーゾーン', 'セクゾ', 'せくぞ', 'sexy zone', 'sexyzone']),
  ('Hey! Say! JUMP', 'Hey! Say! JUMP', ARRAY['ヘイセイジャンプ', 'へいせいじゃんぷ', 'JUMP', 'Hey Say JUMP', 'hey! say! jump', 'heysayjump', '平成ジャンプ']),
  ('Kis-My-Ft2', 'Kis-My-Ft2', ARRAY['キスマイフットツー', 'キスマイ', 'きすまい', 'Kis My Ft2', 'kismyft2', 'KisMyFt2']),
  ('SUPER EIGHT', 'SUPER EIGHT', ARRAY['スーパーエイト', 'エイト', '関ジャニ∞', '関ジャニ', 'かんじゃに', '関ジャニエイト', 'Kanjani8', 'Kanjani Eight', 'super eight']),
  ('WEST.', 'WEST.', ARRAY['ウエスト', 'WEST', 'ジャニーズWEST', 'ジャニスト', 'じゃにすと', 'Johnny''s WEST', 'west']),
  ('Aぇ! group', 'Ae! group', ARRAY['ええぐるーぷ', 'ええぐる', 'Aぇ', 'Ae! group', 'Ae group', 'aegroup']),
  ('NEWS', 'NEWS', ARRAY['ニュース', 'にゅーす', 'news']),
  ('KAT-TUN', 'KAT-TUN', ARRAY['カトゥーン', 'かとぅーん', 'KATTUN', 'kat-tun', 'kattun']),
  ('嵐', 'ARASHI', ARRAY['ARASHI', 'あらし', 'アラシ', 'arashi']),
  ('KinKi Kids', 'KinKi Kids', ARRAY['キンキキッズ', 'きんききっず', 'キンキ', 'KinKi', 'Kinki Kids', 'kinki kids', 'DOMOTO']);

-- 1. content_names と content タグ（無ければ作成）
INSERT INTO public.content_names (name, type)
SELECT g.name, 'anime'
FROM _starto_groups g
WHERE NOT EXISTS (SELECT 1 FROM public.content_names c WHERE c.name = g.name);

INSERT INTO public.tags (name, category, display_context)
SELECT g.name, 'content', '作品'
FROM _starto_groups g
WHERE NOT EXISTS (SELECT 1 FROM public.tags t WHERE t.name = g.name AND t.category = 'content');

-- 2. name_en を埋める（既に値があれば触らない）
UPDATE public.content_names c
SET name_en = coalesce(nullif(btrim(c.name_en), ''), g.name_en)
FROM _starto_groups g
WHERE c.name = g.name;

-- 3. aliases を union マージ
UPDATE public.content_names c
SET aliases = (
  SELECT ARRAY(
    SELECT DISTINCT x FROM unnest(coalesce(c.aliases, '{}') || g.aliases) AS t(x)
    WHERE nullif(btrim(x), '') IS NOT NULL
    ORDER BY 1
  )
)
FROM _starto_groups g
WHERE c.name = g.name;

-- 4. content タグに tag_aliases を追加
INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT a, t.id, NULL
FROM public.tags t
JOIN _starto_groups g ON g.name = t.name
CROSS JOIN LATERAL unnest(g.aliases) AS a
WHERE t.category = 'content'
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS _starto_groups;
