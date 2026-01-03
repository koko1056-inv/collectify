
-- search_pathを設定してセキュリティ強化
CREATE OR REPLACE FUNCTION public.update_user_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
