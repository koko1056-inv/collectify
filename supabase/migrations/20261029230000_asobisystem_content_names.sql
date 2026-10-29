-- ASOBISYSTEM（KAWAII LAB. ほか）のアイドルグループを作品（content_names）として追加する（追加のみ・冪等）。
-- 20261027200000_idol_groups_content_names.sql と同じパターン:
-- 1) content_names（type='anime'）と同名の content タグを、無ければ作る（import_official_batch と同じ display_context）
-- 2) name_en を埋める（既に値があれば触らない）
-- 3) aliases を union マージで拡充（既存のエイリアスは失わない）
-- 4) content タグに同じエイリアスを tag_aliases として追加（検索・サジェスト用）
-- エイリアスはグループ固有の読み・ローマ字・略称だけ。
-- メンバー名・事務所名（アソビシステム）・プロジェクト名（KAWAII LAB.）は入れない。
-- FRUITS ZIPPER / CUTIE STREET は 20261027200000 で追加済み。ここでは表記ゆれ（スペース・大文字小文字）だけ union で足す。

DROP TABLE IF EXISTS _asobi_groups;
CREATE TEMP TABLE _asobi_groups (name text PRIMARY KEY, name_en text, aliases text[]);

INSERT INTO _asobi_groups (name, name_en, aliases) VALUES
  ('CANDY TUNE', 'CANDY TUNE', ARRAY['キャンディーチューン', 'きゃんでぃーちゅーん', 'キャンディチューン', 'キャンチュー', 'きゃんちゅー', 'CANDYTUNE', 'candy tune', 'Candy Tune']),
  ('SWEET STEADY', 'SWEET STEADY', ARRAY['スウィートステディ', 'すうぃーとすてでぃ', 'スイートステディ', 'スイステ', 'すいすて', 'SWEETSTEADY', 'sweet steady', 'Sweet Steady']),
  ('MORE STAR', 'MORE STAR', ARRAY['モアスター', 'もあすたー', 'MORESTAR', 'more star', 'More Star']),
  ('IDOLATER', 'IDOLATER', ARRAY['idolater', 'Idolater']),
  ('新しい学校のリーダーズ', 'ATARASHII GAKKO!', ARRAY['ATARASHII GAKKO!', 'ATARASHII GAKKO', 'Atarashii Gakko!', 'atarashii gakko', 'あたらしいがっこうのりーだーず', 'アタラシイガッコウノリーダーズ', '新しい学校']),
  ('FRUITS ZIPPER', 'FRUITS ZIPPER', ARRAY['Fruits Zipper', 'フルーツ ジッパー']),
  ('CUTIE STREET', 'CUTIE STREET', ARRAY['Cutie Street', 'キューティー ストリート']);

-- 1. content_names と content タグ（無ければ作成）
INSERT INTO public.content_names (name, type)
SELECT g.name, 'anime'
FROM _asobi_groups g
WHERE NOT EXISTS (SELECT 1 FROM public.content_names c WHERE c.name = g.name);

INSERT INTO public.tags (name, category, display_context)
SELECT g.name, 'content', '作品'
FROM _asobi_groups g
WHERE NOT EXISTS (SELECT 1 FROM public.tags t WHERE t.name = g.name AND t.category = 'content');

-- 2. name_en を埋める（既に値があれば触らない）
UPDATE public.content_names c
SET name_en = coalesce(nullif(btrim(c.name_en), ''), g.name_en)
FROM _asobi_groups g
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
FROM _asobi_groups g
WHERE c.name = g.name;

-- 4. content タグに tag_aliases を追加
INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT a, t.id, NULL
FROM public.tags t
JOIN _asobi_groups g ON g.name = t.name
CROSS JOIN LATERAL unnest(g.aliases) AS a
WHERE t.category = 'content'
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS _asobi_groups;
