-- 毎日の新商品チェック（定期実行）の結果の記録。定期実行が execute_sql で書き込み、管理者だけが読める。
CREATE TABLE IF NOT EXISTS public.catalog_import_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_at timestamptz NOT NULL DEFAULT now(),
  added integer NOT NULL DEFAULT 0,
  summary text NOT NULL
);
COMMENT ON TABLE public.catalog_import_log IS '毎日の新商品チェック（定期実行）の結果の記録。管理者だけが読める。';

ALTER TABLE public.catalog_import_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "catalog_import_log_admin_select" ON public.catalog_import_log;
CREATE POLICY "catalog_import_log_admin_select" ON public.catalog_import_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

REVOKE ALL ON public.catalog_import_log FROM anon, authenticated;
GRANT SELECT ON public.catalog_import_log TO authenticated;
