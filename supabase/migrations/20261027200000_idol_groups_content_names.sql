-- 坂道・J アイドル・K-POP の34グループを作品（content_names）として追加する（追加のみ・冪等）。
-- 20261027170000_starto_content_names.sql と同じパターン:
-- 1) content_names（type='anime'）と同名の content タグを、無ければ作る（import_official_batch と同じ display_context）
-- 2) name_en を埋める（既に値があれば触らない）
-- 3) aliases を union マージで拡充（既存のエイリアスは失わない）
-- 4) content タグに同じエイリアスを tag_aliases として追加（検索・サジェスト用）
-- エイリアスはグループ固有の読み・ローマ字・略称・旧名・検索で使われる呼び名だけ。
-- メンバー名・事務所名・ファンネーム・「坂道」「K-POP」などの総称は入れない。
-- 旧名で出た作品（欅坂46 / けやき坂46）は今の名前の作品に入れ、旧名をエイリアスにする。
-- Travis Japan は 20261027170000 で追加済みなのでここには入れない。

DROP TABLE IF EXISTS _idol_groups;
CREATE TEMP TABLE _idol_groups (name text PRIMARY KEY, name_en text, aliases text[]);

INSERT INTO _idol_groups (name, name_en, aliases) VALUES
  -- 坂道
  ('乃木坂46', 'Nogizaka46', ARRAY['乃木坂', 'のぎざか', 'ノギザカ', 'のぎざか46', 'Nogizaka46', 'nogizaka46', 'Nogizaka', 'nogizaka']),
  ('櫻坂46', 'Sakurazaka46', ARRAY['櫻坂', '桜坂46', '桜坂', 'さくらざか', 'サクラザカ', 'Sakurazaka46', 'sakurazaka46', '欅坂46', '欅坂', 'けやきざか', 'Keyakizaka46', 'keyakizaka46']),
  ('日向坂46', 'Hinatazaka46', ARRAY['日向坂', 'ひなたざか', 'ヒナタザカ', 'ひなた', 'Hinatazaka46', 'hinatazaka46', 'けやき坂46', 'ひらがなけやき', 'Hiragana Keyakizaka46']),
  -- J アイドル
  ('JO1', 'JO1', ARRAY['ジェイオーワン', 'じぇいおーわん', 'jo1']),
  ('INI', 'INI', ARRAY['アイエヌアイ', 'あいえぬあい', 'ini']),
  ('ME:I', 'ME:I', ARRAY['ミーアイ', 'みーあい', 'MEI', 'ME I', 'me:i']),
  ('=LOVE', '=LOVE', ARRAY['イコールラブ', 'いこーるらぶ', 'イコラブ', 'いこらぶ', 'Equal LOVE', 'equal love', '=love']),
  ('≠ME', '≠ME', ARRAY['ノットイコールミー', 'のっといこーるみー', 'ノイミー', 'のいみー', 'Not Equal ME', 'not equal me', '≠me']),
  ('≒JOY', '≒JOY', ARRAY['ニアリーイコールジョイ', 'にありーいこーるじょい', 'ニアジョイ', 'にあじょい', 'Nearly Equal JOY', 'nearly equal joy', '≒joy']),
  ('Number_i', 'Number_i', ARRAY['ナンバーアイ', 'なんばーあい', 'Number i', 'NumberI', 'number_i', 'numberi']),
  ('FRUITS ZIPPER', 'FRUITS ZIPPER', ARRAY['フルーツジッパー', 'ふるーつじっぱー', 'ふるっぱー', 'フルッパー', 'FRUITSZIPPER', 'fruits zipper']),
  ('CUTIE STREET', 'CUTIE STREET', ARRAY['キューティーストリート', 'きゅーてぃーすとりーと', 'きゅーすと', 'キュースト', 'CUTIESTREET', 'cutie street']),
  ('AKB48', 'AKB48', ARRAY['エーケービーフォーティーエイト', 'エーケービー', 'えーけーびー', 'AKB', 'akb48']),
  ('ももいろクローバーZ', 'Momoiro Clover Z', ARRAY['ももクロ', 'モモクロ', 'ももいろクローバー', 'Momoiro Clover Z', 'Momoiro Clover', 'momoclo', 'MCZ']),
  ('BABYMETAL', 'BABYMETAL', ARRAY['ベビーメタル', 'べびーめたる', 'ベビメタ', 'べびめた', 'BABY METAL', 'babymetal']),
  ('IMP.', 'IMP.', ARRAY['インプ', 'いんぷ', 'IMP', 'imp.']),
  ('THE RAMPAGE', 'THE RAMPAGE', ARRAY['ザ・ランペイジ', 'ランペイジ', 'らんぺいじ', 'ランペ', 'らんぺ', 'THE RAMPAGE from EXILE TRIBE', 'RAMPAGE', 'the rampage']),
  ('BALLISTIK BOYZ', 'BALLISTIK BOYZ', ARRAY['バリスティックボーイズ', 'ばりすてぃっくぼーいず', 'バリボ', 'ばりぼ', 'BALLISTIK BOYZ from EXILE TRIBE', 'ballistik boyz']),
  ('NiziU', 'NiziU', ARRAY['ニジュー', 'にじゅー', 'niziu', 'NIZIU']),
  -- K-POP
  ('BTS', 'BTS', ARRAY['バンタン', 'ばんたん', '防弾少年団', 'ビーティーエス', '방탄소년단', 'Bangtan Boys', 'BANGTAN', 'bts']),
  ('SEVENTEEN', 'SEVENTEEN', ARRAY['セブンティーン', 'せぶんてぃーん', 'セブチ', 'せぶち', '세븐틴', 'SVT', 'seventeen']),
  ('Stray Kids', 'Stray Kids', ARRAY['ストレイキッズ', 'すとれいきっず', 'スキズ', 'すきず', '스트레이 키즈', 'SKZ', 'StrayKids', 'stray kids']),
  ('TWICE', 'TWICE', ARRAY['トゥワイス', 'とぅわいす', '트와이스', 'twice']),
  ('NewJeans', 'NewJeans', ARRAY['ニュージーンズ', 'にゅーじーんず', '뉴진스', 'New Jeans', 'newjeans']),
  ('LE SSERAFIM', 'LE SSERAFIM', ARRAY['ルセラフィム', 'るせらふぃむ', 'ルセラ', 'るせら', '르세라핌', 'LESSERAFIM', 'le sserafim']),
  ('IVE', 'IVE', ARRAY['アイブ', 'あいぶ', '아이브', 'ive']),
  ('aespa', 'aespa', ARRAY['エスパ', 'えすぱ', '에스파', 'AESPA']),
  ('ENHYPEN', 'ENHYPEN', ARRAY['エンハイフン', 'えんはいふん', 'エナプ', 'えなぷ', '엔하이픈', 'enhypen']),
  ('TOMORROW X TOGETHER', 'TOMORROW X TOGETHER', ARRAY['TXT', 'トゥモローバイトゥギャザー', 'とぅもろーばいとぅぎゃざー', 'トゥバ', '투모로우바이투게더', 'Tomorrow x Together', 'TOMORROW BY TOGETHER', 'txt']),
  ('NCT 127', 'NCT 127', ARRAY['エヌシーティー127', 'えぬしーてぃー127', 'イリチル', 'NCT127', '엔시티 127', 'nct 127', 'nct127']),
  ('&TEAM', '&TEAM', ARRAY['エンティーム', 'えんてぃーむ', 'andTEAM', '& TEAM', '&team']),
  ('BOYNEXTDOOR', 'BOYNEXTDOOR', ARRAY['ボーイネクストドア', 'ぼーいねくすとどあ', 'ボネクド', 'ぼねくど', '보이넥스트도어', 'BND', 'boynextdoor']),
  ('ILLIT', 'ILLIT', ARRAY['アイリット', 'あいりっと', '아일릿', 'illit']),
  ('ZEROBASEONE', 'ZEROBASEONE', ARRAY['ゼロベースワン', 'ぜろべーすわん', 'ゼベワン', 'ぜべわん', '제로베이스원', 'ZB1', 'zerobaseone']);

-- 1. content_names と content タグ（無ければ作成）
INSERT INTO public.content_names (name, type)
SELECT g.name, 'anime'
FROM _idol_groups g
WHERE NOT EXISTS (SELECT 1 FROM public.content_names c WHERE c.name = g.name);

INSERT INTO public.tags (name, category, display_context)
SELECT g.name, 'content', '作品'
FROM _idol_groups g
WHERE NOT EXISTS (SELECT 1 FROM public.tags t WHERE t.name = g.name AND t.category = 'content');

-- 2. name_en を埋める（既に値があれば触らない）
UPDATE public.content_names c
SET name_en = coalesce(nullif(btrim(c.name_en), ''), g.name_en)
FROM _idol_groups g
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
FROM _idol_groups g
WHERE c.name = g.name;

-- 4. content タグに tag_aliases を追加
INSERT INTO public.tag_aliases (alias_name, canonical_tag_id, created_by)
SELECT a, t.id, NULL
FROM public.tags t
JOIN _idol_groups g ON g.name = t.name
CROSS JOIN LATERAL unnest(g.aliases) AS a
WHERE t.category = 'content'
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS _idol_groups;
