-- 運営への要望・追加してほしいコンテンツ。
--  ・ログイン済みなら誰でも送れる（1日5件まで）。送った本人は状況（受付中/確認中/対応予定/対応済み/見送り）を見られる。
--  ・管理者が「公開」にした要望だけが、みんなの要望ボードに出て、「私もほしい」で票が入る（需要が見える）。
--  ・対応済みにすると送った人へ通知。追加してほしいコンテンツが採用されたら +10pt。

CREATE TABLE IF NOT EXISTS public.feedback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('content', 'feature', 'bug', 'other')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  body text CHECK (body IS NULL OR char_length(body) <= 2000),
  url text CHECK (url IS NULL OR (char_length(url) <= 500 AND url ~ '^https?://')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'planned', 'done', 'declined')),
  admin_note text CHECK (admin_note IS NULL OR char_length(admin_note) <= 500),
  is_public boolean NOT NULL DEFAULT false,
  vote_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS feedback_requests_user_idx ON public.feedback_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_requests_public_idx ON public.feedback_requests (vote_count DESC, created_at DESC) WHERE is_public;

CREATE TABLE IF NOT EXISTS public.feedback_votes (
  request_id uuid NOT NULL REFERENCES public.feedback_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, user_id)
);

ALTER TABLE public.feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_votes ENABLE ROW LEVEL SECURITY;

-- 要望: 自分の分・公開されたもの・管理者は全部 を読める
CREATE POLICY feedback_requests_select ON public.feedback_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_public OR public.has_role(auth.uid(), 'admin'::app_role));
-- 送るのは本人だけ。状態や公開・票は触れない
CREATE POLICY feedback_requests_insert ON public.feedback_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'open' AND is_public = false AND vote_count = 0 AND admin_note IS NULL);
-- 対応状況の更新は管理者だけ
CREATE POLICY feedback_requests_update_admin ON public.feedback_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
-- 取り下げ（本人）・削除（管理者）
CREATE POLICY feedback_requests_delete ON public.feedback_requests FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 票: 自分の票だけ読み書きできる。公開された要望にだけ入れられる
CREATE POLICY feedback_votes_select ON public.feedback_votes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY feedback_votes_insert ON public.feedback_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.feedback_requests r WHERE r.id = request_id AND r.is_public));
CREATE POLICY feedback_votes_delete ON public.feedback_votes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 送りすぎ防止（1日5件まで。日本時間の日付で数える）
CREATE OR REPLACE FUNCTION public.feedback_requests_rate_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo';
BEGIN
  IF (SELECT count(*) FROM public.feedback_requests WHERE user_id = NEW.user_id AND created_at >= _day_start) >= 5 THEN
    RAISE EXCEPTION 'feedback_rate_limited' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.feedback_requests_rate_limit() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS feedback_requests_rate_limit ON public.feedback_requests;
CREATE TRIGGER feedback_requests_rate_limit BEFORE INSERT ON public.feedback_requests
  FOR EACH ROW EXECUTE FUNCTION public.feedback_requests_rate_limit();

-- 票の数を保つ
CREATE OR REPLACE FUNCTION public.feedback_votes_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feedback_requests SET vote_count = vote_count + 1 WHERE id = NEW.request_id;
  ELSE
    UPDATE public.feedback_requests SET vote_count = greatest(vote_count - 1, 0) WHERE id = OLD.request_id;
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.feedback_votes_count() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS feedback_votes_count ON public.feedback_votes;
CREATE TRIGGER feedback_votes_count AFTER INSERT OR DELETE ON public.feedback_votes
  FOR EACH ROW EXECUTE FUNCTION public.feedback_votes_count();

-- 状況が変わったら送った人へ通知。追加してほしいコンテンツが対応済みなら +10pt
INSERT INTO public.point_rewards (reason, points, transaction_type, description, once_per_reference, once_per_user, is_active)
VALUES ('request_accepted', 10, 'request_accepted', '要望の採用', true, false, true)
ON CONFLICT (reason) DO NOTHING;

CREATE OR REPLACE FUNCTION public.feedback_requests_status_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'open' THEN
    INSERT INTO public.notifications (user_id, title, message, type, data)
    VALUES (
      NEW.user_id,
      CASE NEW.status
        WHEN 'reviewing' THEN 'ご要望を確認中です'
        WHEN 'planned' THEN 'ご要望を対応予定にしました'
        WHEN 'done' THEN 'ご要望に対応しました'
        ELSE 'ご要望について'
      END,
      NEW.title || CASE WHEN NEW.admin_note IS NOT NULL THEN E'\n' || NEW.admin_note ELSE '' END,
      'feedback_update',
      jsonb_build_object('request_id', NEW.id, 'status', NEW.status)
    );
    IF NEW.status = 'done' AND NEW.kind = 'content' THEN
      PERFORM public.award_social_points(NEW.user_id, 'request_accepted', NEW.id, 100);
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.feedback_requests_status_changed() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS feedback_requests_status_changed ON public.feedback_requests;
CREATE TRIGGER feedback_requests_status_changed BEFORE UPDATE ON public.feedback_requests
  FOR EACH ROW EXECUTE FUNCTION public.feedback_requests_status_changed();

-- 管理画面で送った人のユーザー名を引くための外部キー（profiles 経由）
ALTER TABLE public.feedback_requests
  ADD CONSTRAINT feedback_requests_user_profile_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
