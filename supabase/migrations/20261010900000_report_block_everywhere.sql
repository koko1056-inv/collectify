-- 通報とブロックを、トレード画面だけでなく全ての UGC（ユーザーが作る内容）に広げる
--
-- Apple App Store 審査基準 1.2 が求める「通報」「ブロック」「24 時間以内の対応」の土台。
--
--  1. user_reports をコンテンツ（投稿・コメント・DM・ルームのメッセージ・プロフィール）にも使えるようにする
--  2. 通報の連投を止める（同じ対象は 1 回まで、1 日 20 件まで）
--  3. ブロックを DB 側でも効かせる（DM・コメント・いいね・フォローを拒否、通知を作らない）
--  4. 異なる 3 人以上から通報されたコンテンツを一時的に非表示にする（管理者は復元できる）
--  5. 通報が入ったら管理者へ通知する
--
-- 既存の画面を壊さないため、RLS の書き換えは「非表示のものを見せない」条件の追加だけに留め、
-- ブロックの反映は「書き込み側の拒否（トリガー）」と「クライアントでの除外」で行う。

-- ---------------------------------------------------------------------------
-- 1. user_reports をコンテンツ通報にも使えるようにする
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_reports
  ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS target_id uuid,
  ADD COLUMN IF NOT EXISTS target_excerpt text,
  ADD COLUMN IF NOT EXISTS target_meta jsonb,
  ADD COLUMN IF NOT EXISTS handled_at timestamptz,
  ADD COLUMN IF NOT EXISTS handled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.user_reports.target_type IS
  '通報の対象。user=ユーザー（トレード通報を含む）/ profile / item_post / goods_post / item_post_comment / post_comment / item_comment / message（DM）/ room_message';
COMMENT ON COLUMN public.user_reports.target_id IS '対象の id（user, profile の場合はユーザーの id）。トレード通報では NULL';
COMMENT ON COLUMN public.user_reports.target_excerpt IS '通報時点の本文の抜粋（200 文字まで）。対象が消されても管理者が内容を確認できるように残す';
COMMENT ON COLUMN public.user_reports.target_meta IS '対象へのリンクに使う補助情報（post_id, official_item_id, image など）';

ALTER TABLE public.user_reports DROP CONSTRAINT IF EXISTS user_reports_target_type_check;
ALTER TABLE public.user_reports ADD CONSTRAINT user_reports_target_type_check CHECK (target_type IN (
  'user', 'profile', 'item_post', 'goods_post',
  'item_post_comment', 'post_comment', 'item_comment',
  'message', 'room_message'
));

ALTER TABLE public.user_reports DROP CONSTRAINT IF EXISTS user_reports_target_id_required;
ALTER TABLE public.user_reports ADD CONSTRAINT user_reports_target_id_required
  CHECK (target_type = 'user' OR target_id IS NOT NULL);

-- 理由に UGC 向けを足す（既存の 6 つはそのまま）
ALTER TABLE public.user_reports DROP CONSTRAINT IF EXISTS user_reports_reason_check;
ALTER TABLE public.user_reports ADD CONSTRAINT user_reports_reason_check CHECK (reason IN (
  'no_shipment', 'different_item', 'damaged', 'harassment', 'spam', 'other',
  'inappropriate',  -- 不適切（性的・暴力的・差別的など）
  'copyright',      -- 著作権・肖像権の侵害
  'impersonation',  -- なりすまし
  'privacy'         -- 個人情報の公開
));

-- 同じ人が同じ対象を二重に通報できない（トレード通報は target_id が NULL なので従来の一意制約のまま）
CREATE UNIQUE INDEX IF NOT EXISTS user_reports_one_per_target
  ON public.user_reports (reporter_id, target_type, target_id)
  WHERE target_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_reports_target
  ON public.user_reports (target_type, target_id)
  WHERE target_id IS NOT NULL;

-- 古い未対応から順に見るための索引（24 時間以内の対応のため）
CREATE INDEX IF NOT EXISTS idx_user_reports_pending
  ON public.user_reports (created_at)
  WHERE status IN ('open', 'reviewing');

-- クライアントから直接 INSERT できるのはトレード通報（対象=ユーザー）だけ。
-- コンテンツの通報は submit_report() を通す（対象の存在確認・本文の控え・持ち主の特定をサーバー側でやる）。
DROP POLICY IF EXISTS "user_reports_insert_own" ON public.user_reports;
CREATE POLICY "user_reports_insert_own"
  ON public.user_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reporter_id
    AND target_type = 'user'
    AND target_id IS NULL
    AND target_excerpt IS NULL
    AND target_meta IS NULL
  );

-- 通報の連投を止める: 1 日（直近 24 時間）に 20 件まで
CREATE OR REPLACE FUNCTION public.user_reports_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _recent integer;
BEGIN
  SELECT count(*) INTO _recent
  FROM public.user_reports r
  WHERE r.reporter_id = NEW.reporter_id
    AND r.created_at > now() - interval '24 hours';

  IF _recent >= 20 THEN
    RAISE EXCEPTION 'REPORT_RATE_LIMITED';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.user_reports_before_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_user_reports_before_insert ON public.user_reports;
CREATE TRIGGER trg_user_reports_before_insert
  BEFORE INSERT ON public.user_reports
  FOR EACH ROW EXECUTE FUNCTION public.user_reports_before_insert();

-- 対応済み・却下にした時刻と担当者を残す
CREATE OR REPLACE FUNCTION public.user_reports_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('resolved', 'dismissed') THEN
      NEW.handled_at := now();
      NEW.handled_by := auth.uid();
    ELSE
      NEW.handled_at := NULL;
      NEW.handled_by := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.user_reports_before_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_user_reports_before_update ON public.user_reports;
CREATE TRIGGER trg_user_reports_before_update
  BEFORE UPDATE ON public.user_reports
  FOR EACH ROW EXECUTE FUNCTION public.user_reports_before_update();

-- ---------------------------------------------------------------------------
-- 2. コンテンツの一時非表示（is_hidden）
-- ---------------------------------------------------------------------------

ALTER TABLE public.item_posts          ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS hidden_at timestamptz, ADD COLUMN IF NOT EXISTS hidden_reason text;
ALTER TABLE public.goods_posts         ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS hidden_at timestamptz, ADD COLUMN IF NOT EXISTS hidden_reason text;
ALTER TABLE public.item_post_comments  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS hidden_at timestamptz, ADD COLUMN IF NOT EXISTS hidden_reason text;
ALTER TABLE public.post_comments       ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS hidden_at timestamptz, ADD COLUMN IF NOT EXISTS hidden_reason text;
ALTER TABLE public.item_comments       ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS hidden_at timestamptz, ADD COLUMN IF NOT EXISTS hidden_reason text;
ALTER TABLE public.item_room_messages  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS hidden_at timestamptz, ADD COLUMN IF NOT EXISTS hidden_reason text;

-- 持ち主が自分で is_hidden を戻せないようにする。
-- 変えられるのは、管理者か、SECURITY DEFINER の関数（current_user が authenticated/anon ではない）だけ。
CREATE OR REPLACE FUNCTION public.protect_hidden_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.is_hidden IS DISTINCT FROM OLD.is_hidden
      OR NEW.hidden_at IS DISTINCT FROM OLD.hidden_at
      OR NEW.hidden_reason IS DISTINCT FROM OLD.hidden_reason)
     AND current_user IN ('authenticated', 'anon')
     AND NOT public.has_role(auth.uid(), 'admin')
  THEN
    NEW.is_hidden := OLD.is_hidden;
    NEW.hidden_at := OLD.hidden_at;
    NEW.hidden_reason := OLD.hidden_reason;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_hidden_columns() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  _t text;
BEGIN
  FOREACH _t IN ARRAY ARRAY['item_posts', 'goods_posts', 'item_post_comments', 'post_comments', 'item_comments', 'item_room_messages']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_protect_hidden ON public.%I', _t);
    -- 名前順で他の BEFORE UPDATE トリガーより先に走らせたいので、先頭に来る名前にする
    EXECUTE format('DROP TRIGGER IF EXISTS "000_protect_hidden" ON public.%I', _t);
    EXECUTE format(
      'CREATE TRIGGER "000_protect_hidden" BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.protect_hidden_columns()',
      _t
    );
  END LOOP;
END $$;

-- 非表示のものは、持ち主と管理者以外には見せない（SELECT ポリシーに条件を足すだけ）
DROP POLICY IF EXISTS "item_posts_select_all" ON public.item_posts;
CREATE POLICY "item_posts_select_all"
  ON public.item_posts FOR SELECT
  USING (NOT is_hidden OR user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Anyone can view posts" ON public.goods_posts;
CREATE POLICY "Anyone can view posts"
  ON public.goods_posts FOR SELECT
  USING (NOT is_hidden OR user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "item_post_comments_select_all" ON public.item_post_comments;
CREATE POLICY "item_post_comments_select_all"
  ON public.item_post_comments FOR SELECT
  USING (NOT is_hidden OR user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'admin'));

-- post_comments には同じ内容の SELECT ポリシーが 2 つあった。1 つにまとめる
DROP POLICY IF EXISTS "Anyone can view all comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can view all comments" ON public.post_comments;
CREATE POLICY "Anyone can view all comments"
  ON public.post_comments FOR SELECT
  USING (NOT is_hidden OR user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "item_comments_select_all" ON public.item_comments;
CREATE POLICY "item_comments_select_all"
  ON public.item_comments FOR SELECT
  USING (NOT is_hidden OR user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "item_room_messages_select_member" ON public.item_room_messages;
CREATE POLICY "item_room_messages_select_member"
  ON public.item_room_messages FOR SELECT
  USING (
    (NOT is_hidden OR user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'admin'))
    AND EXISTS (
      SELECT 1
      FROM public.item_rooms r
      WHERE r.id = item_room_messages.room_id
        AND public.can_access_item_room(auth.uid(), r.official_item_id)
    )
  );

-- 非表示の切り替え本体（内部用。クライアントからは呼べない）
CREATE OR REPLACE FUNCTION public.set_content_hidden_internal(
  _target_type text,
  _target_id uuid,
  _hidden boolean,
  _reason text
)
RETURNS boolean  -- 状態が変わったら true
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _n integer := 0;
  _at timestamptz := CASE WHEN _hidden THEN now() ELSE NULL END;
  _why text := CASE WHEN _hidden THEN _reason ELSE NULL END;
BEGIN
  IF _target_type = 'item_post' THEN
    UPDATE public.item_posts SET is_hidden = _hidden, hidden_at = _at, hidden_reason = _why
      WHERE id = _target_id AND is_hidden IS DISTINCT FROM _hidden;
  ELSIF _target_type = 'goods_post' THEN
    UPDATE public.goods_posts SET is_hidden = _hidden, hidden_at = _at, hidden_reason = _why
      WHERE id = _target_id AND is_hidden IS DISTINCT FROM _hidden;
  ELSIF _target_type = 'item_post_comment' THEN
    UPDATE public.item_post_comments SET is_hidden = _hidden, hidden_at = _at, hidden_reason = _why
      WHERE id = _target_id AND is_hidden IS DISTINCT FROM _hidden;
  ELSIF _target_type = 'post_comment' THEN
    UPDATE public.post_comments SET is_hidden = _hidden, hidden_at = _at, hidden_reason = _why
      WHERE id = _target_id AND is_hidden IS DISTINCT FROM _hidden;
  ELSIF _target_type = 'item_comment' THEN
    UPDATE public.item_comments SET is_hidden = _hidden, hidden_at = _at, hidden_reason = _why
      WHERE id = _target_id AND is_hidden IS DISTINCT FROM _hidden;
  ELSIF _target_type = 'room_message' THEN
    UPDATE public.item_room_messages SET is_hidden = _hidden, hidden_at = _at, hidden_reason = _why
      WHERE id = _target_id AND is_hidden IS DISTINCT FROM _hidden;
  ELSE
    RETURN false;  -- 非表示にできない種類（user, profile, message）
  END IF;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.set_content_hidden_internal(text, uuid, boolean, text) FROM PUBLIC, anon, authenticated;

-- 管理者が非表示・復元する。復元したときは、その対象の未対応の通報を却下にする
-- （残しておくと次の通報 1 件でまた 3 人に達して自動で隠れてしまうため）。
CREATE OR REPLACE FUNCTION public.admin_set_content_hidden(
  _target_type text,
  _target_id uuid,
  _hidden boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  PERFORM public.set_content_hidden_internal(_target_type, _target_id, _hidden, 'admin');

  IF NOT _hidden THEN
    UPDATE public.user_reports
       SET status = 'dismissed'
     WHERE target_type = _target_type
       AND target_id = _target_id
       AND status IN ('open', 'reviewing');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_content_hidden(text, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_content_hidden(text, uuid, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. 通報の受け付け（コンテンツ）
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_report(
  _target_type text,
  _target_id uuid,
  _reason text,
  _detail text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _owner uuid;
  _excerpt text;
  _meta jsonb := '{}'::jsonb;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  IF _target_id IS NULL THEN
    RAISE EXCEPTION 'TARGET_NOT_FOUND';
  END IF;

  IF _target_type IN ('user', 'profile') THEN
    SELECT p.id, left(coalesce(p.display_name, p.username, '') || ' ' || coalesce(p.bio, ''), 200),
           jsonb_build_object('username', p.username)
      INTO _owner, _excerpt, _meta
      FROM public.profiles p WHERE p.id = _target_id;

  ELSIF _target_type = 'item_post' THEN
    SELECT x.user_id, left(coalesce(x.caption, ''), 200),
           jsonb_build_object(
             'image', (SELECT i.image_url FROM public.item_post_images i WHERE i.post_id = x.id ORDER BY i.display_order LIMIT 1)
           )
      INTO _owner, _excerpt, _meta
      FROM public.item_posts x WHERE x.id = _target_id;

  ELSIF _target_type = 'goods_post' THEN
    SELECT x.user_id, left(coalesce(x.caption, ''), 200), jsonb_build_object('image', x.image_url)
      INTO _owner, _excerpt, _meta
      FROM public.goods_posts x WHERE x.id = _target_id;

  ELSIF _target_type = 'item_post_comment' THEN
    SELECT x.user_id, left(x.content, 200), jsonb_build_object('post_id', x.post_id)
      INTO _owner, _excerpt, _meta
      FROM public.item_post_comments x WHERE x.id = _target_id;

  ELSIF _target_type = 'post_comment' THEN
    SELECT x.user_id, left(x.comment, 200), jsonb_build_object('post_id', x.post_id)
      INTO _owner, _excerpt, _meta
      FROM public.post_comments x WHERE x.id = _target_id;

  ELSIF _target_type = 'item_comment' THEN
    SELECT x.user_id, left(x.content, 200), jsonb_build_object('official_item_id', x.official_item_id)
      INTO _owner, _excerpt, _meta
      FROM public.item_comments x WHERE x.id = _target_id;

  ELSIF _target_type = 'message' THEN
    -- DM は、受け取った側だけが通報できる
    SELECT x.sender_id, left(x.content, 200), jsonb_build_object('sender_id', x.sender_id)
      INTO _owner, _excerpt, _meta
      FROM public.messages x WHERE x.id = _target_id AND x.receiver_id = _uid;

  ELSIF _target_type = 'room_message' THEN
    SELECT x.user_id, left(x.content, 200), jsonb_build_object('room_id', x.room_id, 'official_item_id', r.official_item_id)
      INTO _owner, _excerpt, _meta
      FROM public.item_room_messages x
      JOIN public.item_rooms r ON r.id = x.room_id
      WHERE x.id = _target_id
        AND public.can_access_item_room(_uid, r.official_item_id);

  ELSE
    RAISE EXCEPTION 'INVALID_TARGET_TYPE';
  END IF;

  IF _owner IS NULL THEN
    RAISE EXCEPTION 'TARGET_NOT_FOUND';
  END IF;
  IF _owner = _uid THEN
    RAISE EXCEPTION 'SELF_REPORT';
  END IF;

  BEGIN
    INSERT INTO public.user_reports (
      reporter_id, reported_user_id, reason, detail,
      target_type, target_id, target_excerpt, target_meta
    )
    VALUES (
      _uid, _owner, _reason, nullif(btrim(left(coalesce(_detail, ''), 1000)), ''),
      _target_type, _target_id, nullif(_excerpt, ''), _meta
    )
    RETURNING id INTO _id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'ALREADY_REPORTED';
  END;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_report(text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_report(text, uuid, text, text) TO authenticated;

-- 通報が入った後の処理: 3 人以上で自動非表示 + 管理者への通知
CREATE OR REPLACE FUNCTION public.user_reports_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _n integer;
  _changed boolean;
  _admin uuid;
BEGIN
  IF NEW.target_id IS NOT NULL THEN
    SELECT count(DISTINCT r.reporter_id) INTO _n
    FROM public.user_reports r
    WHERE r.target_type = NEW.target_type
      AND r.target_id = NEW.target_id
      AND r.status IN ('open', 'reviewing');

    IF _n >= 3 THEN
      _changed := public.set_content_hidden_internal(NEW.target_type, NEW.target_id, true, 'auto_reports');
      IF _changed THEN
        INSERT INTO public.notifications (user_id, type, title, message, data, is_read)
        VALUES (
          NEW.reported_user_id,
          'warning',
          '投稿を一時的に非表示にしました',
          '複数の方から通報があったため、該当の内容を一時的に非表示にしました。運営が内容を確認します。',
          jsonb_build_object('target_type', NEW.target_type),
          false
        );
      END IF;
    END IF;
  END IF;

  FOR _admin IN SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, data, is_read)
    VALUES (
      _admin,
      'admin_report',
      '新しい通報が届きました',
      '種類: ' || NEW.target_type || ' / 理由: ' || NEW.reason || '（24 時間以内に確認してください）',
      jsonb_build_object('report_id', NEW.id, 'target_type', NEW.target_type, 'url', '/admin?tab=reports'),
      false
    );
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.user_reports_after_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_user_reports_after_insert ON public.user_reports;
CREATE TRIGGER trg_user_reports_after_insert
  AFTER INSERT ON public.user_reports
  FOR EACH ROW EXECUTE FUNCTION public.user_reports_after_insert();

-- ---------------------------------------------------------------------------
-- 4. ブロックを効かせる
-- ---------------------------------------------------------------------------

-- a と b の間にブロックがあるか（どちら向きでも）。
CREATE OR REPLACE FUNCTION public.is_blocked_between(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _a IS NOT NULL AND _b IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_blocks b
    WHERE (b.blocker_id = _a AND b.blocked_id = _b)
       OR (b.blocker_id = _b AND b.blocked_id = _a)
  );
$$;

REVOKE ALL ON FUNCTION public.is_blocked_between(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_blocked_between(uuid, uuid) TO authenticated;

-- 自分がブロックした人 + 自分をブロックした人。一覧から除外するために使う。
CREATE OR REPLACE FUNCTION public.get_blocked_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.blocked_id FROM public.user_blocks b WHERE b.blocker_id = auth.uid()
  UNION
  SELECT b.blocker_id FROM public.user_blocks b WHERE b.blocked_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_blocked_user_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_blocked_user_ids() TO authenticated;

-- ブロックの関係にある相手への DM・コメント・いいね・リアクション・フォローを拒否する。
-- エラーの文面は、ブロックされた側に「ブロックされている」と分からないよう汎用にしてある。
CREATE OR REPLACE FUNCTION public.enforce_not_blocked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid;
  _owner uuid;
  _owner2 uuid;
BEGIN
  IF TG_TABLE_NAME = 'messages' THEN
    _actor := NEW.sender_id;
    _owner := NEW.receiver_id;
  ELSIF TG_TABLE_NAME = 'follows' THEN
    _actor := NEW.follower_id;
    _owner := NEW.following_id;
  ELSIF TG_TABLE_NAME IN ('item_post_comments', 'item_post_likes', 'item_post_reactions') THEN
    _actor := NEW.user_id;
    SELECT p.user_id INTO _owner FROM public.item_posts p WHERE p.id = NEW.post_id;
  ELSIF TG_TABLE_NAME = 'post_comments' THEN
    _actor := NEW.user_id;
    SELECT p.user_id INTO _owner FROM public.goods_posts p WHERE p.id = NEW.post_id;
    IF NEW.parent_comment_id IS NOT NULL THEN
      SELECT c.user_id INTO _owner2 FROM public.post_comments c WHERE c.id = NEW.parent_comment_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'post_likes' THEN
    _actor := NEW.user_id;
    SELECT p.user_id INTO _owner FROM public.goods_posts p WHERE p.id = NEW.post_id;
  ELSIF TG_TABLE_NAME = 'item_comments' THEN
    _actor := NEW.user_id;
    IF NEW.parent_id IS NOT NULL THEN
      SELECT c.user_id INTO _owner FROM public.item_comments c WHERE c.id = NEW.parent_id;
    END IF;
  END IF;

  IF public.is_blocked_between(_actor, _owner) OR public.is_blocked_between(_actor, _owner2) THEN
    RAISE EXCEPTION 'この操作はできません' USING ERRCODE = 'P0001', HINT = 'BLOCKED';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_not_blocked() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  _t text;
BEGIN
  FOREACH _t IN ARRAY ARRAY[
    'messages', 'follows',
    'item_post_comments', 'item_post_likes', 'item_post_reactions',
    'post_comments', 'post_likes', 'item_comments'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_not_blocked ON public.%I', _t);
    EXECUTE format(
      'CREATE TRIGGER trg_enforce_not_blocked BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_not_blocked()',
      _t
    );
  END LOOP;
END $$;

-- ブロックの関係にある相手が起こした出来事（コメント・いいね・リアクションなど）の通知は作らない。
-- data の actor_id / commenter_id / liker_id / sender_id を見る。
CREATE OR REPLACE FUNCTION public.suppress_blocked_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _raw text;
BEGIN
  IF NEW.data IS NULL OR jsonb_typeof(NEW.data) <> 'object' THEN
    RETURN NEW;
  END IF;

  _raw := coalesce(NEW.data ->> 'actor_id', NEW.data ->> 'commenter_id', NEW.data ->> 'liker_id', NEW.data ->> 'sender_id');

  IF _raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     AND public.is_blocked_between(NEW.user_id, _raw::uuid)
  THEN
    RETURN NULL;  -- この通知は作らない
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.suppress_blocked_notifications() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_suppress_blocked_notifications ON public.notifications;
CREATE TRIGGER trg_suppress_blocked_notifications
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.suppress_blocked_notifications();

-- ブロックしたら、お互いのフォロー関係を外す
CREATE OR REPLACE FUNCTION public.user_blocks_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.follows f
  WHERE (f.follower_id = NEW.blocker_id AND f.following_id = NEW.blocked_id)
     OR (f.follower_id = NEW.blocked_id AND f.following_id = NEW.blocker_id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.user_blocks_after_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_user_blocks_after_insert ON public.user_blocks;
CREATE TRIGGER trg_user_blocks_after_insert
  AFTER INSERT ON public.user_blocks
  FOR EACH ROW EXECUTE FUNCTION public.user_blocks_after_insert();
