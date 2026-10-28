-- アイカツ！ / もちにゃみ のエイリアス拡充（追加のみ・冪等）。
-- アイカツスターズ！・フレンズ！・オンパレード！・プラネット！・アカデミー！ 等は
-- 別作品にせず `アイカツ！` 1作品にまとめる方針のため、シリーズ名と読みを
-- content_names.aliases と content タグの tag_aliases に union で足す。
-- キャラ名はエイリアスに入れない。

-- 1. content_names.aliases を union マージ（既存のエイリアスは失わない）
UPDATE public.content_names c
SET aliases = (
  SELECT ARRAY(
    SELECT DISTINCT x FROM unnest(coalesce(c.aliases, '{}') || v.new_arr) AS t(x)
    WHERE nullif(btrim(x), '') IS NOT NULL
    ORDER BY 1
  )
)
FROM (VALUES
  ('アイカツ！', ARRAY[
    'アイカツ', 'アイカツ!', 'アイカツ！シリーズ', 'アイカツシリーズ', 'あいかつ！', 'Aikatsu',
    'アイカツスターズ！', 'アイカツスターズ', 'アイカツスターズ!', 'aikatsu stars', 'Aikatsu Stars!',
    'アイカツフレンズ！', 'アイカツフレンズ', 'アイカツフレンズ!', 'aikatsu friends', 'Aikatsu Friends!',
    'アイカツオンパレード！', 'アイカツオンパレード', 'アイカツオンパレード!', 'aikatsu on parade', 'Aikatsu on Parade!',
    'アイカツプラネット！', 'アイカツプラネット', 'アイカツプラネット!', 'aikatsu planet', 'Aikatsu Planet!',
    'アイカツ！アカデミー！', 'アイカツアカデミー', 'アイカツ!アカデミー!', 'aikatsu academy', 'Aikatsu Academy!',
    'データカードダス アイカツ', 'データカードダス アイカツ！', 'データカードダスアイカツ',
    'アイカツカード', 'アイカツ！カード', 'あいかつすたーず', 'あいかつふれんず'
  ]),
  ('もちにゃみ', ARRAY['モチニャミ', 'mochinyami', 'Mochinyami'])
) AS v(name, new_arr)
WHERE c.name = v.name;

-- 2. content タグに、同じエイリアスを tag_aliases として追加（検索・サジェスト用）
INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT a, t.id, NULL
FROM public.tags t
JOIN (VALUES
  ('アイカツ！', ARRAY[
    'アイカツ', 'アイカツ!', 'アイカツ！シリーズ', 'アイカツシリーズ', 'あいかつ！', 'Aikatsu', 'Aikatsu!', 'aikatsu', 'あいかつ',
    'アイカツスターズ！', 'アイカツスターズ', 'アイカツスターズ!', 'aikatsu stars', 'Aikatsu Stars!',
    'アイカツフレンズ！', 'アイカツフレンズ', 'アイカツフレンズ!', 'aikatsu friends', 'Aikatsu Friends!',
    'アイカツオンパレード！', 'アイカツオンパレード', 'アイカツオンパレード!', 'aikatsu on parade', 'Aikatsu on Parade!',
    'アイカツプラネット！', 'アイカツプラネット', 'アイカツプラネット!', 'aikatsu planet', 'Aikatsu Planet!',
    'アイカツ！アカデミー！', 'アイカツアカデミー', 'アイカツ!アカデミー!', 'aikatsu academy', 'Aikatsu Academy!',
    'データカードダス アイカツ', 'データカードダス アイカツ！', 'データカードダスアイカツ',
    'アイカツカード', 'アイカツ！カード', 'あいかつすたーず', 'あいかつふれんず'
  ]),
  ('もちにゃみ', ARRAY['モチニャミ', 'mochinyami', 'Mochinyami', 'もちにゃみちゃん'])
) AS v(name, arr) ON v.name = t.name
CROSS JOIN LATERAL unnest(v.arr) AS a
WHERE t.category = 'content'
  AND a <> t.name
ON CONFLICT DO NOTHING;
