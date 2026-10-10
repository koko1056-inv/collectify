-- 作品名の英語表記（海外のユーザー向けの表示と、英語名での検索に使う）
ALTER TABLE public.content_names ADD COLUMN IF NOT EXISTS name_en text;

UPDATE public.content_names c SET name_en = v.en
FROM (VALUES
  ('ミセスグリーンアップル', 'Mrs. GREEN APPLE'),
  ('ホロライブ', 'hololive'),
  ('ちいかわ', 'Chiikawa'),
  ('にじさんじ', 'NIJISANJI'),
  ('サンリオ', 'Sanrio'),
  ('ONE PIECE', 'ONE PIECE'),
  ('ドラゴンボール', 'Dragon Ball'),
  ('鬼滅の刃', 'Demon Slayer: Kimetsu no Yaiba'),
  ('推しの子', 'Oshi no Ko'),
  ('葬送のフリーレン', 'Frieren: Beyond Journey''s End'),
  ('進撃の巨人', 'Attack on Titan'),
  ('ブルーロック', 'BLUE LOCK'),
  ('呪術廻戦', 'Jujutsu Kaisen'),
  ('僕のヒーローアカデミア', 'My Hero Academia'),
  ('東京リベンジャーズ', 'Tokyo Revengers'),
  ('ハイキュー!!', 'Haikyu!!'),
  ('ジョジョの奇妙な冒険', 'JoJo''s Bizarre Adventure'),
  ('チェンソーマン', 'Chainsaw Man'),
  ('SPY×FAMILY', 'SPY x FAMILY'),
  ('NARUTO', 'NARUTO'),
  ('あんさんぶるスターズ！！', 'Ensemble Stars!!'),
  ('アイカツ！', 'Aikatsu!'),
  ('Ado', 'Ado'),
  ('SLAM DUNK', 'SLAM DUNK'),
  ('YOASOBI', 'YOASOBI')
) AS v(ja, en)
WHERE c.name = v.ja AND c.name_en IS NULL;
