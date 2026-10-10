-- あいまい検索と「もしかして」。
--  ・ひらがな/カタカナ、全角/半角、大文字小文字、記号・空白の違いを無視して当てる
--  ・英語名・別名（content_names.name_en / aliases）でも当てる
--  ・軽い打ち間違いは trigram の類似度で当てる（含む検索で少ないときだけ）
--  ・suggest_names: 入力に近い作品・タグを返す（「もしかして」）

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- 検索用の正規化: NFKC（全角/半角を統一）→ 小文字 → カタカナをひらがなに → 記号を空白に → 空白をまとめる
CREATE OR REPLACE FUNCTION public.search_norm(_s text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
SET search_path TO 'public'
AS $$
  SELECT btrim(regexp_replace(
    regexp_replace(
      translate(lower(normalize(coalesce(_s, ''), NFKC)), 'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶ', 'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゕゖ'),
      '[・･･\-_.,、。''’"“”!?~〜:;/\\()（）「」『』【】\[\]<>＜＞&＆+＋*★☆♪♡♥]+', ' ', 'g'),
    '\s+', ' ', 'g'))
$$;


ALTER TABLE public.content_names ADD COLUMN IF NOT EXISTS aliases text[];
ALTER TABLE public.official_items ADD COLUMN IF NOT EXISTS search_text text;

UPDATE public.content_names c SET aliases = v.a
FROM (VALUES
  ('ミセスグリーンアップル', ARRAY['ミセス','mga','ミセグリ','mrs','ミセスグリーン','ミセスグリーンアップル']),
  ('ホロライブ', ARRAY['hololive','ホロ','holo','ホロライブプロダクション']),
  ('にじさんじ', ARRAY['nijisanji','にじ','虹']),
  ('ちいかわ', ARRAY['chiikawa','ちーかわ','ちいかわ']),
  ('サンリオ', ARRAY['sanrio','サンリオキャラクターズ']),
  ('ONE PIECE', ARRAY['ワンピース','ワンピ','onepiece','one piece']),
  ('ドラゴンボール', ARRAY['dragonball','dragon ball','db','dbz','ドラゴンボールz','ドラゴンボール超','ドラゴンボールsuper']),
  ('鬼滅の刃', ARRAY['きめつ','鬼滅','kimetsu','kimetsu no yaiba','demon slayer','きめつのやいば']),
  ('推しの子', ARRAY['おしのこ','oshi no ko','oshinoko']),
  ('葬送のフリーレン', ARRAY['フリーレン','frieren','そうそうのふりーれん']),
  ('進撃の巨人', ARRAY['進撃','しんげき','しんげきのきょじん','attack on titan','aot','shingeki']),
  ('ブルーロック', ARRAY['bluelock','blue lock','ブルロ','ぶるーろっく']),
  ('呪術廻戦', ARRAY['呪術','じゅじゅつ','じゅじゅつかいせん','jujutsu kaisen','jujutsu','jjk']),
  ('僕のヒーローアカデミア', ARRAY['ヒロアカ','ひろあか','hero academia','my hero academia','mha','bnha','ぼくのひーろーあかでみあ']),
  ('東京リベンジャーズ', ARRAY['東リベ','とうりべ','東卍','tokyo revengers','tokyorevengers']),
  ('ハイキュー!!', ARRAY['haikyuu','haikyu','はいきゅー','ハイキュー']),
  ('ジョジョの奇妙な冒険', ARRAY['ジョジョ','じょじょ','jojo','jojos bizarre adventure']),
  ('チェンソーマン', ARRAY['chainsaw man','chainsawman','チェンソー','ちぇんそーまん']),
  ('SPY×FAMILY', ARRAY['スパイファミリー','スパファミ','spy family','spyfamily','spy x family','すぱいふぁみりー']),
  ('NARUTO', ARRAY['ナルト','なると','naruto','ナルト疾風伝']),
  ('あんさんぶるスターズ！！', ARRAY['あんスタ','あんさんぶるすたーず','ensemble stars','enstars','ensemblestars']),
  ('アイカツ！', ARRAY['aikatsu','あいかつ']),
  ('Ado', ARRAY['アド','ado']),
  ('SLAM DUNK', ARRAY['スラムダンク','スラダン','slamdunk','すらむだんく']),
  ('YOASOBI', ARRAY['ヨアソビ','よあそび','yoasobi']),
  ('もちにゃみ', ARRAY['mochinyami','もち','もちにゃみ'])
) AS v(n, a)
WHERE c.name = v.n;

-- 検索用の本文: タイトル + 作品名 + 英語名 + 別名 を正規化し、空白を除く
CREATE OR REPLACE FUNCTION public.official_item_search_text(_title text, _content_name text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT replace(public.search_norm(
    coalesce(_title, '') || ' ' || coalesce(_content_name, '') || ' ' ||
    coalesce((SELECT c.name_en || ' ' || array_to_string(coalesce(c.aliases, ARRAY[]::text[]), ' ')
                FROM public.content_names c WHERE c.name = _content_name ORDER BY c.created_at LIMIT 1), '')
  ), ' ', '')
$$;

CREATE OR REPLACE FUNCTION public.official_items_set_search_text() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  NEW.search_text := public.official_item_search_text(NEW.title, NEW.content_name);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.official_items_set_search_text() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.official_item_search_text(text, text) FROM PUBLIC, anon, authenticated;

-- 既存の商品に入れる（作品ごと）
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT content_name FROM public.official_items WHERE content_name IS NOT NULL LOOP
    UPDATE public.official_items o SET search_text = public.official_item_search_text(o.title, o.content_name)
     WHERE o.content_name = r.content_name AND o.search_text IS NULL;
  END LOOP;
END $$;
UPDATE public.official_items SET search_text = public.official_item_search_text(title, content_name) WHERE search_text IS NULL;

DROP TRIGGER IF EXISTS official_items_set_search_text ON public.official_items;
CREATE TRIGGER official_items_set_search_text BEFORE INSERT OR UPDATE OF title, content_name ON public.official_items
  FOR EACH ROW EXECUTE FUNCTION public.official_items_set_search_text();

-- 作品の英語名・別名を直したら、その作品の商品の検索用の本文を作り直す
CREATE OR REPLACE FUNCTION public.content_names_refresh_search_text() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.name_en IS DISTINCT FROM OLD.name_en OR NEW.aliases IS DISTINCT FROM OLD.aliases OR NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.official_items o SET search_text = public.official_item_search_text(o.title, o.content_name)
     WHERE o.content_name IN (OLD.name, NEW.name);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.content_names_refresh_search_text() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS content_names_refresh_search_text ON public.content_names;
CREATE TRIGGER content_names_refresh_search_text AFTER UPDATE ON public.content_names
  FOR EACH ROW EXECUTE FUNCTION public.content_names_refresh_search_text();

CREATE INDEX IF NOT EXISTS official_items_search_text_trgm ON public.official_items
  USING gin (search_text extensions.gin_trgm_ops) WHERE merged_into IS NULL;

-- 検索: 近い順に id と全体の件数を返す
CREATE OR REPLACE FUNCTION public.search_official_items(_q text, _limit integer DEFAULT 200, _offset integer DEFAULT 0)
RETURNS TABLE(id uuid, total bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _nq text := public.search_norm(_q);
  _tokens text[];
  _t text;
  _exact text := '';
  _fuzzy text := '';
  _score text := '0';
  _like text;
  _cnt bigint;
BEGIN
  SELECT coalesce(array_agg(replace(tk, ' ', '')), ARRAY[]::text[]) INTO _tokens
    FROM (SELECT tk FROM unnest(string_to_array(_nq, ' ')) AS tk WHERE tk <> '' LIMIT 6) s;
  IF array_length(_tokens, 1) IS NULL THEN RETURN; END IF;

  FOREACH _t IN ARRAY _tokens LOOP
    _like := '%' || replace(replace(replace(_t, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    _exact := _exact || format(' AND o.search_text LIKE %L', _like);
    IF char_length(_t) >= 3 THEN
      _fuzzy := _fuzzy || format(' AND (o.search_text LIKE %L OR %L <%% o.search_text)', _like, _t);
      _score := _score || format(' + word_similarity(%L, o.search_text)', _t);
    ELSE
      _fuzzy := _fuzzy || format(' AND o.search_text LIKE %L', _like);
    END IF;
  END LOOP;

  -- まず、含む（表記ゆれは正規化済み）で探す。少なければ、打ち間違いも許して探し直す
  EXECUTE 'SELECT count(*) FROM public.official_items o WHERE o.merged_into IS NULL' || _exact INTO _cnt;
  IF _cnt >= 8 THEN
    RETURN QUERY EXECUTE
      'SELECT o.id, count(*) OVER () FROM public.official_items o WHERE o.merged_into IS NULL' || _exact ||
      ' ORDER BY o.release_date DESC, o.created_at DESC, o.id LIMIT $1 OFFSET $2'
      USING _limit, _offset;
  ELSE
    PERFORM set_config('pg_trgm.word_similarity_threshold', '0.5', true);
    RETURN QUERY EXECUTE
      'SELECT o.id, count(*) OVER () FROM public.official_items o WHERE o.merged_into IS NULL' || _fuzzy ||
      ' ORDER BY (' || _score || ') DESC, o.release_date DESC, o.created_at DESC, o.id LIMIT $1 OFFSET $2'
      USING _limit, _offset;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.search_official_items(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_official_items(text, integer, integer) TO anon, authenticated;

-- 「もしかして」: 入力に近い作品名・タグ（表記ゆれ・英語名・別名・打ち間違いを許す）
CREATE OR REPLACE FUNCTION public.suggest_names(_q text, _kind text DEFAULT 'any', _limit integer DEFAULT 5)
RETURNS TABLE(kind text, id uuid, name text, category text, matched text, score real)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _nq text := replace(public.search_norm(_q), ' ', '');
BEGIN
  IF char_length(_nq) < 2 THEN RETURN; END IF;

  RETURN QUERY
  WITH cand AS (
    SELECT 'content'::text AS k, c.id, c.name, NULL::text AS cat, v.variant AS matched,
           (CASE
              WHEN replace(public.search_norm(v.variant), ' ', '') = _nq THEN 1.0
              WHEN replace(public.search_norm(v.variant), ' ', '') LIKE _nq || '%' THEN 0.9
              WHEN replace(public.search_norm(v.variant), ' ', '') LIKE '%' || _nq || '%' THEN 0.75
              ELSE word_similarity(_nq, replace(public.search_norm(v.variant), ' ', ''))
            END)::real AS sc
      FROM public.content_names c
      CROSS JOIN LATERAL unnest(ARRAY[c.name, c.name_en] || coalesce(c.aliases, ARRAY[]::text[])) AS v(variant)
     WHERE _kind IN ('any', 'content') AND v.variant IS NOT NULL
    UNION ALL
    SELECT 'tag', t.id, t.name, t.category, t.name,
           (CASE
              WHEN replace(public.search_norm(t.name), ' ', '') = _nq THEN 1.0
              WHEN replace(public.search_norm(t.name), ' ', '') LIKE _nq || '%' THEN 0.9
              WHEN replace(public.search_norm(t.name), ' ', '') LIKE '%' || _nq || '%' THEN 0.75
              ELSE word_similarity(_nq, replace(public.search_norm(t.name), ' ', ''))
            END)::real
      FROM public.tags t
     WHERE _kind IN ('any', 'tag') AND t.name IS NOT NULL
    UNION ALL
    SELECT 'tag', t.id, t.name, t.category, a.alias_name,
           (CASE
              WHEN replace(public.search_norm(a.alias_name), ' ', '') = _nq THEN 1.0
              WHEN replace(public.search_norm(a.alias_name), ' ', '') LIKE _nq || '%' THEN 0.9
              WHEN replace(public.search_norm(a.alias_name), ' ', '') LIKE '%' || _nq || '%' THEN 0.75
              ELSE word_similarity(_nq, replace(public.search_norm(a.alias_name), ' ', ''))
            END)::real
      FROM public.tag_aliases a JOIN public.tags t ON t.id = a.canonical_tag_id
     WHERE _kind IN ('any', 'tag')
  ), best AS (
    SELECT DISTINCT ON (cand.k, cand.id) cand.k, cand.id, cand.name, cand.cat, cand.matched, cand.sc
      FROM cand WHERE cand.sc >= 0.45
     ORDER BY cand.k, cand.id, cand.sc DESC
  )
  SELECT b.k, b.id, b.name, b.cat, b.matched, b.sc FROM best b
   ORDER BY b.sc DESC, b.name LIMIT greatest(_limit, 1);
END $$;
REVOKE ALL ON FUNCTION public.suggest_names(text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suggest_names(text, text, integer) TO anon, authenticated;
