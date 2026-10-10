-- 画像プロキシが中継してよいホストの一覧。管理者（または取り込み用の管理アカウント）が登録した
-- 公式グッズの画像ホストだけがトリガーで自動的に入る。Edge Function（service role）だけが読む。
CREATE TABLE IF NOT EXISTS public.proxy_allowed_hosts (
  host text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.proxy_allowed_hosts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.proxy_allowed_hosts FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_proxy_allowed_host() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _h text;
BEGIN
  IF NEW.image IS NULL OR NEW.image NOT LIKE 'https://%' THEN RETURN NEW; END IF;
  IF NOT (NEW.created_by = '2cbe8645-0347-4d9d-8a6d-3dbb8a3c1df3'::uuid
          OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = NEW.created_by AND r.role = 'admin')) THEN
    RETURN NEW;
  END IF;
  _h := lower(substring(NEW.image from '^https://([^/:?#]+)'));
  IF _h IS NOT NULL AND _h <> '' THEN
    INSERT INTO public.proxy_allowed_hosts (host) VALUES (_h) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_proxy_allowed_host() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS record_proxy_allowed_host ON public.official_items;
CREATE TRIGGER record_proxy_allowed_host AFTER INSERT OR UPDATE OF image ON public.official_items
  FOR EACH ROW EXECUTE FUNCTION public.record_proxy_allowed_host();

WITH admins AS (SELECT user_id FROM public.user_roles WHERE role = 'admin' UNION SELECT '2cbe8645-0347-4d9d-8a6d-3dbb8a3c1df3'::uuid)
INSERT INTO public.proxy_allowed_hosts (host)
SELECT DISTINCT lower(substring(o.image from '^https://([^/:?#]+)'))
  FROM public.official_items o JOIN admins a ON a.user_id = o.created_by
 WHERE o.image LIKE 'https://%'
ON CONFLICT DO NOTHING;
