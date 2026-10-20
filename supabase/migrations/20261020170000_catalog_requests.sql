-- 「この推し（作品・グッズ）を追加してほしい」リクエスト。
-- カタログ検索で見つからなかったときに送れる、軽いリクエスト。
-- 本人と管理者だけが内容を見られ、管理者は正規化した件数ランキングで需要を見られる。

-- ---------------------------------------------------------------------------
-- 1. 正規化（全角英数・記号・空白をある程度揃えて、小文字・前後の空白を外す）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_catalog_query(_q text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(btrim(regexp_replace(
    replace(
      translate(
        coalesce(_q, ''),
        (SELECT string_agg(chr(i), '') FROM generate_series(65281, 65374) AS i),
        (SELECT string_agg(chr(i - 65248), '') FROM generate_series(65281, 65374) AS i)
      ),
      chr(12288), ' '
    ),
    '\s+', ' ', 'g'
  )));
$$;

REVOKE ALL ON FUNCTION public.normalize_catalog_query(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_catalog_query(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. テーブル
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalog_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  query text NOT NULL CHECK (char_length(query) BETWEEN 1 AND 100),
  kind text NOT NULL DEFAULT 'content' CHECK (kind IN ('content', 'goods')),
  context text CHECK (context IS NULL OR context IN ('starter', 'guest_starter', 'search', 'interests')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_requests_user_idx ON public.catalog_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS catalog_requests_created_idx ON public.catalog_requests (created_at DESC);

-- 管理画面で送った人のユーザー名を引くための外部キー（profiles 経由。feedback_requests と同じ形）
ALTER TABLE public.catalog_requests
  ADD CONSTRAINT catalog_requests_user_profile_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.catalog_requests ENABLE ROW LEVEL SECURITY;

GRANT INSERT ON public.catalog_requests TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.catalog_requests TO authenticated;

-- 送るのは本人（ログイン済みは自分のuser_id、未ログインはuser_id null）だけ
CREATE POLICY catalog_requests_insert ON public.catalog_requests FOR INSERT TO public
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

-- 読めるのは本人の分と管理者だけ（未ログインで送った分は誰も読み返せない＝一方通行のリクエスト）
CREATE POLICY catalog_requests_select ON public.catalog_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY catalog_requests_update_admin ON public.catalog_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY catalog_requests_delete_admin ON public.catalog_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- 3. 送りすぎ防止（前後の空白を外し、1日30件まで、同じ人が同じ語を1日に出せるのは1回まで）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.catalog_requests_before_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo';
BEGIN
  NEW.query := btrim(NEW.query);
  IF char_length(NEW.query) < 1 THEN
    RAISE EXCEPTION 'catalog_request_invalid_query' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.user_id IS NOT NULL THEN
    IF (
      SELECT count(*) FROM public.catalog_requests r
      WHERE r.user_id = NEW.user_id AND r.created_at >= _day_start
    ) >= 30 THEN
      RAISE EXCEPTION 'catalog_request_rate_limited' USING ERRCODE = 'P0001';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.catalog_requests r
      WHERE r.user_id = NEW.user_id
        AND r.created_at >= _day_start
        AND public.normalize_catalog_query(r.query) = public.normalize_catalog_query(NEW.query)
    ) THEN
      RAISE EXCEPTION 'catalog_request_duplicate' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.catalog_requests_before_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS catalog_requests_before_insert ON public.catalog_requests;
CREATE TRIGGER catalog_requests_before_insert BEFORE INSERT ON public.catalog_requests
  FOR EACH ROW EXECUTE FUNCTION public.catalog_requests_before_insert();

-- ---------------------------------------------------------------------------
-- 4. 管理者向け: 正規化した語ごとの集計（件数順）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.catalog_request_ranking(_limit integer DEFAULT 50)
RETURNS TABLE (
  query_norm text,
  sample_query text,
  request_count integer,
  unique_user_count integer,
  last_requested_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
  SELECT
    public.normalize_catalog_query(r.query) AS query_norm,
    (array_agg(r.query ORDER BY r.created_at DESC))[1] AS sample_query,
    count(*)::integer AS request_count,
    count(DISTINCT r.user_id)::integer AS unique_user_count,
    max(r.created_at) AS last_requested_at
  FROM public.catalog_requests r
  GROUP BY public.normalize_catalog_query(r.query)
  ORDER BY count(*) DESC, max(r.created_at) DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 50), 200));
END;
$$;
REVOKE ALL ON FUNCTION public.catalog_request_ranking(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.catalog_request_ranking(integer) TO authenticated;
