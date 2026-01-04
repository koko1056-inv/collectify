-- 1. usage_countを既存データから集計して更新
UPDATE public.tags t
SET usage_count = (
  SELECT COALESCE(
    (SELECT COUNT(*) FROM public.item_tags it WHERE it.tag_id = t.id), 0
  ) + COALESCE(
    (SELECT COUNT(*) FROM public.user_item_tags uit WHERE uit.tag_id = t.id), 0
  )
);

-- 2. 同名タグにdisplay_contextを設定（カテゴリ別）
-- キャラクタータグ
UPDATE public.tags 
SET display_context = 'キャラクター'
WHERE category = 'character' 
  AND display_context IS NULL
  AND name IN (
    SELECT name FROM public.tags 
    WHERE status = 'approved'
    GROUP BY name HAVING COUNT(*) > 1
  );

-- シリーズタグ
UPDATE public.tags 
SET display_context = 'シリーズ'
WHERE category = 'series' 
  AND display_context IS NULL
  AND name IN (
    SELECT name FROM public.tags 
    WHERE status = 'approved'
    GROUP BY name HAVING COUNT(*) > 1
  );

-- グッズタイプタグ
UPDATE public.tags 
SET display_context = 'グッズタイプ'
WHERE category = 'type' 
  AND display_context IS NULL
  AND name IN (
    SELECT name FROM public.tags 
    WHERE status = 'approved'
    GROUP BY name HAVING COUNT(*) > 1
  );

-- カテゴリ未設定のタグ
UPDATE public.tags 
SET display_context = '未分類'
WHERE category IS NULL 
  AND display_context IS NULL
  AND name IN (
    SELECT name FROM public.tags 
    WHERE status = 'approved'
    GROUP BY name HAVING COUNT(*) > 1
  );

-- 3. 追加のエイリアス（よくある表記ゆれ）
-- ラバスト
INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'ラバスト', id, NULL
FROM public.tags
WHERE name = 'ラバーストラップ' AND category = 'type' AND status = 'approved'
LIMIT 1
ON CONFLICT DO NOTHING;

-- アクキー
INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'アクキー', id, NULL
FROM public.tags
WHERE name = 'アクリルキーホルダー' AND category = 'type' AND status = 'approved'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ブロマイド
INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'ブロマイド', id, NULL
FROM public.tags
WHERE name = '生写真' AND category = 'type' AND status = 'approved'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT '写真', id, NULL
FROM public.tags
WHERE name = '生写真' AND category = 'type' AND status = 'approved'
LIMIT 1
ON CONFLICT DO NOTHING;

-- タペストリー
INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'タペ', id, NULL
FROM public.tags
WHERE name = 'タペストリー' AND category = 'type' AND status = 'approved'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ペンライト
INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'ペンラ', id, NULL
FROM public.tags
WHERE name = 'ペンライト' AND category = 'type' AND status = 'approved'
LIMIT 1
ON CONFLICT DO NOTHING;

-- マスコット/ぬい関連
INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'マスコット', id, NULL
FROM public.tags
WHERE name = 'ぬいぐるみ' AND category = 'type' AND status = 'approved'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'もちころりん', id, NULL
FROM public.tags
WHERE name = 'ぬいぐるみ' AND category = 'type' AND status = 'approved'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Tシャツ表記ゆれ
INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'tシャツ', id, NULL
FROM public.tags
WHERE name = 'Tシャツ' AND category = 'type' AND status = 'approved'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'ティーシャツ', id, NULL
FROM public.tags
WHERE name = 'Tシャツ' AND category = 'type' AND status = 'approved'
LIMIT 1
ON CONFLICT DO NOTHING;