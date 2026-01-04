-- 人気のあるタグにエイリアスを追加（表記ゆれ対策）
-- まず既存のタグIDを取得してエイリアスを追加

-- アクスタのエイリアス
INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'アクリルスタンド', id, NULL
FROM public.tags
WHERE name = 'アクスタ' AND category = 'type'
ON CONFLICT DO NOTHING;

INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'アクリルスタンドキーホルダー', id, NULL
FROM public.tags
WHERE name = 'アクスタ' AND category = 'type'
ON CONFLICT DO NOTHING;

-- 缶バのエイリアス
INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT '缶バッジ', id, NULL
FROM public.tags
WHERE name = '缶バ' AND category = 'type'
ON CONFLICT DO NOTHING;

INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT '缶バッチ', id, NULL
FROM public.tags
WHERE name = '缶バ' AND category = 'type'
ON CONFLICT DO NOTHING;

-- トレカのエイリアス
INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'トレーディングカード', id, NULL
FROM public.tags
WHERE name = 'トレカ' AND category = 'type'
ON CONFLICT DO NOTHING;

INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'カード', id, NULL
FROM public.tags
WHERE name = 'トレカ' AND category = 'type'
ON CONFLICT DO NOTHING;

-- ぬいぐるみのエイリアス
INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'ぬい', id, NULL
FROM public.tags
WHERE name = 'ぬいぐるみ' AND category = 'type'
ON CONFLICT DO NOTHING;

INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'ちびぬい', id, NULL
FROM public.tags
WHERE name = 'ぬいぐるみ' AND category = 'type'
ON CONFLICT DO NOTHING;

-- クリアファイルのエイリアス
INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'クリファ', id, NULL
FROM public.tags
WHERE name = 'クリアファイル' AND category = 'type'
ON CONFLICT DO NOTHING;

-- キーホルダーのエイリアス
INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'キーホル', id, NULL
FROM public.tags
WHERE name = 'キーホルダー' AND category = 'type'
ON CONFLICT DO NOTHING;

INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'キーチェーン', id, NULL
FROM public.tags
WHERE name = 'キーホルダー' AND category = 'type'
ON CONFLICT DO NOTHING;

-- ポストカードのエイリアス
INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'ポスカ', id, NULL
FROM public.tags
WHERE name = 'ポストカード' AND category = 'type'
ON CONFLICT DO NOTHING;

-- チェキのエイリアス
INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'インスタント写真', id, NULL
FROM public.tags
WHERE name = 'チェキ' AND category = 'type'
ON CONFLICT DO NOTHING;

INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT 'ポラロイド', id, NULL
FROM public.tags
WHERE name = 'チェキ' AND category = 'type'
ON CONFLICT DO NOTHING;