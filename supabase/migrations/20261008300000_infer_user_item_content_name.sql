-- 公式グッズに結びついていない手入力・交換由来のグッズは、作品名（content_name）が空のまま残り、
-- 推し宇宙などで「その他」にまとめられていた。
-- 写真が同じ、または題名が同じ公式グッズから、作品が1つに決まるときだけ作品名を補う。
--   ・infer_content_name(題名, 写真) : 補う作品名（決まらなければ null）
--   ・追加のたびに自動で補うトリガー
--   ・すでにあるグッズへの一括補完

CREATE OR REPLACE FUNCTION public.infer_content_name(_title text, _image text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    -- 写真が同じ公式グッズがあれば、その作品（作品が1つに決まるときだけ）
    (SELECT min(oi.content_name) FROM public.official_items oi
      WHERE coalesce(_image, '') <> '' AND oi.image = _image AND coalesce(oi.content_name, '') <> ''
      HAVING count(DISTINCT oi.content_name) = 1),
    -- 題名が同じ公式グッズが、1つの作品にしか無いとき（空白の違いは無視）
    (SELECT min(oi.content_name) FROM public.official_items oi
      WHERE regexp_replace(coalesce(_title, ''), '[\s　]+', '', 'g') <> ''
        AND lower(regexp_replace(oi.title, '[\s　]+', '', 'g')) = lower(regexp_replace(_title, '[\s　]+', '', 'g'))
        AND coalesce(oi.content_name, '') <> ''
      HAVING count(DISTINCT oi.content_name) = 1)
  );
$$;

REVOKE ALL ON FUNCTION public.infer_content_name(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.infer_content_name(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.user_items_fill_content_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.official_item_id IS NULL AND coalesce(btrim(new.content_name), '') = '' THEN
    new.content_name := public.infer_content_name(new.title, new.image);
  END IF;
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER trg_user_items_fill_content_name
  BEFORE INSERT ON public.user_items
  FOR EACH ROW EXECUTE FUNCTION public.user_items_fill_content_name();

-- すでにあるグッズへ
UPDATE public.user_items u
SET content_name = public.infer_content_name(u.title, u.image)
WHERE u.official_item_id IS NULL
  AND coalesce(btrim(u.content_name), '') = ''
  AND public.infer_content_name(u.title, u.image) IS NOT NULL;
