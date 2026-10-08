-- 交換の改善
--
--  1. 申請を作る口をサーバーの関数 create_trade_request に集約する
--     （これまでは画面から直接 INSERT していて、持ち主かどうか・ブロック・二重約束を誰も確かめていなかった）
--  2. 承認したら、同じ品を巻き込む他の申請を自動で取り下げる（二重に約束できない）
--  3. 申請・承認・発送・受取・完了・取消のたびに、相手へ通知を出す
--  4. 「欲しいものを持っている人」を欲しいもの単位で返す find_holders_for_my_wishes
--  5. 取引が終わったあと、受け取った品をコレクションに入れ、手放した品を外す apply_trade_to_collection
--  6. 返事のない申請は14日で期限切れ、承認後に止まった取引は7日でお知らせ
--  7. 交換中の品を、持ち主が消してしまわないようにする
--
-- 申請の品は、あとから持ち主が消しても履歴で何だったか分かるよう、題名と写真を申請側にも控える。

-- ---------------------------------------------------------------------------
-- 1. 列の追加（控え・理由・完了後の反映）
-- ---------------------------------------------------------------------------

ALTER TABLE public.trade_requests
  ADD COLUMN IF NOT EXISTS offered_title             text,
  ADD COLUMN IF NOT EXISTS offered_image             text,
  ADD COLUMN IF NOT EXISTS offered_official_item_id  uuid,
  ADD COLUMN IF NOT EXISTS requested_title           text,
  ADD COLUMN IF NOT EXISTS requested_image           text,
  ADD COLUMN IF NOT EXISTS requested_official_item_id uuid,
  ADD COLUMN IF NOT EXISTS cancel_reason             text,
  ADD COLUMN IF NOT EXISTS nudged_at                 timestamptz,
  ADD COLUMN IF NOT EXISTS sender_applied_at         timestamptz,
  ADD COLUMN IF NOT EXISTS receiver_applied_at       timestamptz;

COMMENT ON COLUMN public.trade_requests.cancel_reason IS
  '取り消された理由。expired=期限切れ / superseded=別の申請が成立 / item_removed=品が消えた。当事者の取消は cancelled_by が入る。';
COMMENT ON COLUMN public.trade_requests.sender_applied_at IS
  '申し込んだ側が、完了後の内容（受け取った品の追加・手放した品の削除）を自分のコレクションへ反映した時刻。';

-- 既存の申請にも控えを入れておく
UPDATE public.trade_requests t
SET offered_title = COALESCE(t.offered_title, o.title),
    offered_image = COALESCE(t.offered_image, o.image),
    offered_official_item_id = COALESCE(t.offered_official_item_id, o.official_item_id)
FROM public.user_items o
WHERE o.id = t.offered_item_id
  AND (t.offered_title IS NULL OR t.offered_image IS NULL);

UPDATE public.trade_requests t
SET requested_title = COALESCE(t.requested_title, r.title),
    requested_image = COALESCE(t.requested_image, r.image),
    requested_official_item_id = COALESCE(t.requested_official_item_id, r.official_item_id)
FROM public.user_items r
WHERE r.id = t.requested_item_id
  AND (t.requested_title IS NULL OR t.requested_image IS NULL);

-- 品を消しても申請の履歴は残す（控えがあるので何だったかは分かる）
ALTER TABLE public.trade_requests ALTER COLUMN offered_item_id DROP NOT NULL;
ALTER TABLE public.trade_requests ALTER COLUMN requested_item_id DROP NOT NULL;

ALTER TABLE public.trade_requests DROP CONSTRAINT IF EXISTS trade_requests_offered_item_id_fkey;
ALTER TABLE public.trade_requests DROP CONSTRAINT IF EXISTS trade_requests_requested_item_id_fkey;
ALTER TABLE public.trade_requests
  ADD CONSTRAINT trade_requests_offered_item_id_fkey
    FOREIGN KEY (offered_item_id) REFERENCES public.user_items(id) ON DELETE SET NULL,
  ADD CONSTRAINT trade_requests_requested_item_id_fkey
    FOREIGN KEY (requested_item_id) REFERENCES public.user_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trade_requests_offered_item ON public.trade_requests (offered_item_id) WHERE status IN ('pending', 'accepted');
CREATE INDEX IF NOT EXISTS idx_trade_requests_requested_item ON public.trade_requests (requested_item_id) WHERE status IN ('pending', 'accepted');

-- ---------------------------------------------------------------------------
-- 2. 交換中の品かどうか
-- ---------------------------------------------------------------------------

-- 承認済みの取引に入っている品は、ほかの取引には使えない。
CREATE OR REPLACE FUNCTION public.trade_item_in_progress(_item uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trade_requests t
    WHERE t.status = 'accepted'
      AND (t.offered_item_id = _item OR t.requested_item_id = _item)
  );
$$;

REVOKE ALL ON FUNCTION public.trade_item_in_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trade_item_in_progress(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. 申請を作る
-- ---------------------------------------------------------------------------

-- 画面は _requested_item_id（相手の品）と _offered_item_id（自分の品）を渡すだけ。
-- 持ち主・ブロック・二重約束はここで確かめる。
-- 同じ自分の品を、複数の相手に同時に申し込むのは許す（先に承認された1件が成立し、残りは自動で取り下げられる）。
CREATE OR REPLACE FUNCTION public.create_trade_request(
  _requested_item_id uuid,
  _offered_item_id uuid,
  _message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  req public.user_items;
  off public.user_items;
  prof_privacy text;
  t public.trade_requests;
BEGIN
  IF me IS NULL THEN
    RETURN public.trade_error('not_signed_in');
  END IF;

  SELECT * INTO req FROM public.user_items WHERE id = _requested_item_id;
  IF NOT FOUND THEN
    RETURN public.trade_error('item_not_found');
  END IF;

  SELECT * INTO off FROM public.user_items WHERE id = _offered_item_id AND user_id = me;
  IF NOT FOUND THEN
    RETURN public.trade_error('not_your_item');
  END IF;

  IF req.user_id = me THEN
    RETURN public.trade_error('self_trade');
  END IF;

  -- どちらかがブロックしていれば申し込めない
  IF EXISTS (
    SELECT 1 FROM public.user_blocks b
    WHERE (b.blocker_id = me AND b.blocked_id = req.user_id)
       OR (b.blocker_id = req.user_id AND b.blocked_id = me)
  ) THEN
    RETURN public.trade_error('blocked');
  END IF;

  SELECT privacy_level::text INTO prof_privacy FROM public.profiles WHERE id = req.user_id;
  IF prof_privacy = 'private' THEN
    RETURN public.trade_error('private_profile');
  END IF;

  IF public.trade_item_in_progress(off.id) THEN
    RETURN public.trade_error('offered_committed');
  END IF;
  IF public.trade_item_in_progress(req.id) THEN
    RETURN public.trade_error('requested_committed');
  END IF;

  -- 同じ相手の同じ品へ、返事待ちの申請をもう出している
  IF EXISTS (
    SELECT 1 FROM public.trade_requests x
    WHERE x.sender_id = me AND x.requested_item_id = req.id AND x.status = 'pending'
  ) THEN
    RETURN public.trade_error('duplicate');
  END IF;

  -- 返事待ちを出しすぎない（出しっぱなしで相手の受信箱を埋めないため）
  IF (SELECT count(*) FROM public.trade_requests x WHERE x.sender_id = me AND x.status = 'pending') >= 20 THEN
    RETURN public.trade_error('too_many_pending');
  END IF;

  INSERT INTO public.trade_requests (
    sender_id, receiver_id, offered_item_id, requested_item_id, message, status, shipping_status,
    offered_title, offered_image, offered_official_item_id,
    requested_title, requested_image, requested_official_item_id
  ) VALUES (
    me, req.user_id, off.id, req.id, NULLIF(btrim(left(COALESCE(_message, ''), 500)), ''), 'pending', 'not_shipped',
    off.title, off.image, off.official_item_id,
    req.title, req.image, req.official_item_id
  )
  RETURNING * INTO t;

  RETURN public.trade_state_json(t);
END;
$$;

REVOKE ALL ON FUNCTION public.create_trade_request(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_trade_request(uuid, uuid, text) TO authenticated;

-- 画面からの直接 INSERT は閉じる（上の関数だけが入口）
DROP POLICY IF EXISTS "Users can create trade requests" ON public.trade_requests;

-- ---------------------------------------------------------------------------
-- 4. 承認 / 辞退（同じ品を巻き込む他の申請を取り下げる）
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.respond_to_trade_request(_trade_id uuid, _accept boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.trade_requests;
BEGIN
  SELECT * INTO t FROM public.trade_requests WHERE id = _trade_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN public.trade_error('not_found');
  END IF;
  IF auth.uid() IS DISTINCT FROM t.receiver_id THEN
    RETURN public.trade_error('not_receiver');
  END IF;
  IF t.status <> 'pending' THEN
    RETURN public.trade_error('not_pending');
  END IF;

  IF _accept THEN
    IF t.offered_item_id IS NULL OR t.requested_item_id IS NULL THEN
      RETURN public.trade_error('item_gone');
    END IF;
    -- どちらかの品が、すでに別の取引で成立していたら承認できない
    IF EXISTS (
      SELECT 1 FROM public.trade_requests o
      WHERE o.id <> t.id AND o.status = 'accepted'
        AND (o.offered_item_id IN (t.offered_item_id, t.requested_item_id)
          OR o.requested_item_id IN (t.offered_item_id, t.requested_item_id))
    ) THEN
      RETURN public.trade_error('item_taken');
    END IF;
  END IF;

  UPDATE public.trade_requests
  SET status = CASE WHEN _accept THEN 'accepted' ELSE 'rejected' END,
      shipping_status = CASE WHEN _accept THEN 'not_shipped' ELSE shipping_status END,
      responded_at = now()
  WHERE id = _trade_id
  RETURNING * INTO t;

  -- 成立した品を含む、返事待ちの申請は取り下げる
  IF _accept THEN
    UPDATE public.trade_requests o
    SET status = 'cancelled', cancelled_at = now(), cancel_reason = 'superseded'
    WHERE o.id <> t.id AND o.status = 'pending'
      AND (o.offered_item_id IN (t.offered_item_id, t.requested_item_id)
        OR o.requested_item_id IN (t.offered_item_id, t.requested_item_id));
  END IF;

  RETURN public.trade_state_json(t);
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_trade_request(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_trade_request(uuid, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. 通知
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_trade_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s_name text;
  r_name text;
  base jsonb;
  off_t text := COALESCE(NEW.offered_title, '');
  req_t text := COALESCE(NEW.requested_title, '');
BEGIN
  IF COALESCE(NEW.is_open, false) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(display_name, ''), username) INTO s_name FROM public.profiles WHERE id = NEW.sender_id;
  SELECT COALESCE(NULLIF(display_name, ''), username) INTO r_name FROM public.profiles WHERE id = NEW.receiver_id;
  base := jsonb_build_object('trade_id', NEW.id, 'url', '/search?tab=trade');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, message, type, data)
    VALUES (NEW.receiver_id, '交換の申請が届きました',
            COALESCE(s_name, '誰か') || 'さんから、「' || req_t || '」に「' || off_t || '」での交換申請です',
            'trade_request', base || jsonb_build_object('partner_id', NEW.sender_id));
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'accepted' THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (NEW.sender_id, '交換の申請が承認されました',
              COALESCE(r_name, '相手') || 'さんが「' || req_t || '」の交換を承認しました。発送の準備をしましょう',
              'trade_accepted', base || jsonb_build_object('partner_id', NEW.receiver_id));
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (NEW.sender_id, '交換の申請は見送られました',
              COALESCE(r_name, '相手') || 'さんは「' || req_t || '」の交換を見送りました',
              'trade_rejected', base || jsonb_build_object('partner_id', NEW.receiver_id));
    ELSIF NEW.status = 'cancelled' THEN
      IF NEW.cancelled_by IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, data)
        VALUES (CASE WHEN NEW.cancelled_by = NEW.sender_id THEN NEW.receiver_id ELSE NEW.sender_id END,
                '交換が取り消されました',
                COALESCE(CASE WHEN NEW.cancelled_by = NEW.sender_id THEN s_name ELSE r_name END, '相手')
                  || 'さんが「' || req_t || '」の交換を取り消しました',
                'trade_cancelled',
                base || jsonb_build_object('partner_id', NEW.cancelled_by));
      ELSE
        INSERT INTO public.notifications (user_id, title, message, type, data)
        VALUES (NEW.sender_id, '交換の申請が取り下げられました',
                CASE NEW.cancel_reason
                  WHEN 'expired' THEN '返事がないまま期限が来たため、「' || req_t || '」への申請を取り下げました'
                  WHEN 'superseded' THEN '「' || req_t || '」の品が別の交換で成立したため、申請を取り下げました'
                  ELSE '「' || req_t || '」の品が見つからなくなったため、申請を取り下げました'
                END,
                'trade_unavailable', base || jsonb_build_object('partner_id', NEW.receiver_id));
      END IF;
    ELSIF NEW.status = 'completed' THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (NEW.sender_id, '交換が完了しました', '「' || req_t || '」の交換が完了しました。コレクションに反映できます',
              'trade_completed', base || jsonb_build_object('partner_id', NEW.receiver_id)),
             (NEW.receiver_id, '交換が完了しました', '「' || off_t || '」の交換が完了しました。コレクションに反映できます',
              'trade_completed', base || jsonb_build_object('partner_id', NEW.sender_id));
    END IF;
  END IF;

  -- 発送・受取（完了した瞬間の受取は「完了」の通知にまとめる）
  IF NEW.status = 'accepted' THEN
    IF NEW.sender_shipped_at IS NOT NULL AND OLD.sender_shipped_at IS NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (NEW.receiver_id, '交換の品が発送されました',
              COALESCE(s_name, '相手') || 'さんが「' || off_t || '」を発送しました。届いたら「受け取った」を押してください',
              'trade_shipped', base || jsonb_build_object('partner_id', NEW.sender_id));
    END IF;
    IF NEW.receiver_shipped_at IS NOT NULL AND OLD.receiver_shipped_at IS NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (NEW.sender_id, '交換の品が発送されました',
              COALESCE(r_name, '相手') || 'さんが「' || req_t || '」を発送しました。届いたら「受け取った」を押してください',
              'trade_shipped', base || jsonb_build_object('partner_id', NEW.receiver_id));
    END IF;
    IF NEW.sender_received_at IS NOT NULL AND OLD.sender_received_at IS NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (NEW.receiver_id, '相手が品を受け取りました',
              COALESCE(s_name, '相手') || 'さんが「' || req_t || '」を受け取りました。あなたも届いたら「受け取った」を押してください',
              'trade_received', base || jsonb_build_object('partner_id', NEW.sender_id));
    END IF;
    IF NEW.receiver_received_at IS NOT NULL AND OLD.receiver_received_at IS NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (NEW.sender_id, '相手が品を受け取りました',
              COALESCE(r_name, '相手') || 'さんが「' || off_t || '」を受け取りました。あなたも届いたら「受け取った」を押してください',
              'trade_received', base || jsonb_build_object('partner_id', NEW.receiver_id));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_trade_event() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_trade_event ON public.trade_requests;
CREATE TRIGGER trg_notify_trade_event
AFTER INSERT OR UPDATE ON public.trade_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_trade_event();

-- 通知・申請・メッセージを画面がすぐ反映できるように（公開に入っていなければ追加）
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['trade_requests', 'messages', 'notifications'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 6. 欲しいものを持っている人
-- ---------------------------------------------------------------------------

-- 自分の「欲しい」1件ごとに、それを持っている他の人を返す。
-- 交換に出している人(for_trade)を先に、次に持っている数・実績の順。
-- 出していない人にも申請はできるので、出していない人も含める（画面で区別する）。
-- ブロックした/された相手と、非公開のプロフィールは含めない。
CREATE OR REPLACE FUNCTION public.find_holders_for_my_wishes(_limit integer DEFAULT 40)
RETURNS TABLE (
  wish_id uuid,
  official_item_id uuid,
  title text,
  image text,
  content_name text,
  holder_count integer,
  trade_ok_count integer,
  holders jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH hidden AS (
    SELECT b.blocked_id AS uid FROM public.user_blocks b WHERE b.blocker_id = auth.uid()
    UNION
    SELECT b.blocker_id AS uid FROM public.user_blocks b WHERE b.blocked_id = auth.uid()
  ),
  cand AS (
    SELECT w.id AS wid, w.official_item_id AS oid,
           ui.id AS uiid, ui.user_id AS uid, ui.for_trade, ui.quantity,
           pr.username, pr.display_name, pr.avatar_url,
           COALESCE(ts.trade_score, 0) AS tscore, COALESCE(ts.trade_count, 0) AS tcount,
           EXISTS (
             SELECT 1 FROM public.trade_requests tr
             WHERE tr.sender_id = auth.uid() AND tr.requested_item_id = ui.id
               AND tr.status IN ('pending', 'accepted')
           ) AS already_requested,
           public.trade_item_in_progress(ui.id) AS busy
    FROM public.wishlists w
    JOIN public.user_items ui ON ui.official_item_id = w.official_item_id AND ui.user_id <> auth.uid()
    JOIN public.profiles pr ON pr.id = ui.user_id
    LEFT JOIN public.user_trust_scores ts ON ts.user_id = ui.user_id
    WHERE w.user_id = auth.uid()
      AND w.official_item_id IS NOT NULL
      AND ui.user_id NOT IN (SELECT h.uid FROM hidden h)
      AND (pr.privacy_level::text = 'public'
           OR (pr.privacy_level::text = 'followers' AND EXISTS (
                 SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = pr.id)))
  )
  SELECT
    c.wid,
    oi.id,
    oi.title,
    oi.image,
    oi.content_name,
    count(*)::integer,
    (count(*) FILTER (WHERE c.for_trade AND NOT c.busy))::integer,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', x.uid,
        'username', x.username,
        'display_name', x.display_name,
        'avatar_url', x.avatar_url,
        'user_item_id', x.uiid,
        'for_trade', x.for_trade,
        'quantity', x.quantity,
        'trade_score', x.tscore,
        'trade_count', x.tcount,
        'already_requested', x.already_requested,
        'busy', x.busy
      ))
      FROM (
        SELECT c2.* FROM cand c2 WHERE c2.wid = c.wid
        ORDER BY (c2.for_trade AND NOT c2.busy) DESC, c2.busy ASC, c2.tcount DESC, c2.quantity DESC, c2.username
        LIMIT 6
      ) x
    )
  FROM cand c
  JOIN public.official_items oi ON oi.id = c.oid
  GROUP BY c.wid, oi.id, oi.title, oi.image, oi.content_name
  ORDER BY 7 DESC, 6 DESC, oi.title
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 40), 100));
$$;

REVOKE ALL ON FUNCTION public.find_holders_for_my_wishes(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_holders_for_my_wishes(integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. 完了後のコレクション反映
-- ---------------------------------------------------------------------------

-- 取引が完了したあと、自分の側だけを反映する（相手のコレクションには触れない）。
--   ・受け取った品をコレクションへ入れる（すでに同じ公式グッズを持っていれば数を足す）
--   ・その品を「欲しい」から外す
--   ・手放した品を1つ減らす（1つだけなら外す）
-- 2回押しても二重に反映しない。
CREATE OR REPLACE FUNCTION public.apply_trade_to_collection(_trade_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  t public.trade_requests;
  is_sender boolean;
  got_title text;
  got_image text;
  got_official uuid;
  gave_id uuid;
  gave public.user_items;
  got_src public.user_items;
  oi public.official_items;
  added boolean := false;
  removed boolean := false;
BEGIN
  SELECT * INTO t FROM public.trade_requests WHERE id = _trade_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN public.trade_error('not_found');
  END IF;
  IF me IS NULL OR me NOT IN (t.sender_id, t.receiver_id) THEN
    RETURN public.trade_error('not_participant');
  END IF;
  IF t.status <> 'completed' THEN
    RETURN public.trade_error('not_completed');
  END IF;

  is_sender := (me = t.sender_id);
  IF (is_sender AND t.sender_applied_at IS NOT NULL) OR (NOT is_sender AND t.receiver_applied_at IS NOT NULL) THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;

  IF is_sender THEN
    got_title := t.requested_title; got_image := t.requested_image; got_official := t.requested_official_item_id;
    gave_id := t.offered_item_id;
  ELSE
    got_title := t.offered_title; got_image := t.offered_image; got_official := t.offered_official_item_id;
    gave_id := t.requested_item_id;
  END IF;

  -- 受け取った品を入れる
  IF got_official IS NOT NULL THEN
    SELECT * INTO oi FROM public.official_items WHERE id = got_official;
    SELECT * INTO got_src FROM public.user_items WHERE user_id = me AND official_item_id = got_official LIMIT 1;
  END IF;

  IF got_src.id IS NOT NULL THEN
    UPDATE public.user_items SET quantity = COALESCE(quantity, 1) + 1 WHERE id = got_src.id;
  ELSE
    INSERT INTO public.user_items (user_id, title, image, quantity, official_item_id, content_name, release_date, for_trade)
    VALUES (me, COALESCE(got_title, oi.title, '交換で受け取ったグッズ'), COALESCE(got_image, oi.image),
            1, got_official, oi.content_name, oi.release_date, false);
  END IF;
  added := true;

  -- 欲しいものから外す
  IF got_official IS NOT NULL THEN
    DELETE FROM public.wishlists WHERE user_id = me AND official_item_id = got_official;
  END IF;

  -- 手放した品を減らす
  IF gave_id IS NOT NULL THEN
    SELECT * INTO gave FROM public.user_items WHERE id = gave_id AND user_id = me;
    IF FOUND THEN
      IF COALESCE(gave.quantity, 1) > 1 THEN
        UPDATE public.user_items SET quantity = quantity - 1 WHERE id = gave.id;
      ELSE
        DELETE FROM public.user_items WHERE id = gave.id;
      END IF;
      removed := true;
    END IF;
  END IF;

  IF is_sender THEN
    UPDATE public.trade_requests SET sender_applied_at = now() WHERE id = t.id;
  ELSE
    UPDATE public.trade_requests SET receiver_applied_at = now() WHERE id = t.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'already', false, 'added', added, 'removed', removed);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_trade_to_collection(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_trade_to_collection(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. 交換中の品を消さない / 消えた品の返事待ちを閉じる
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_user_item_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 本人が画面から消すときだけ止める（アカウント削除などの連鎖は止めない）
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.user_id AND public.trade_item_in_progress(OLD.id) THEN
    RAISE EXCEPTION 'trade_in_progress' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.trade_requests
  SET status = 'cancelled', cancelled_at = now(), cancel_reason = 'item_removed'
  WHERE status = 'pending' AND (offered_item_id = OLD.id OR requested_item_id = OLD.id);

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_user_item_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_user_item_delete ON public.user_items;
CREATE TRIGGER trg_guard_user_item_delete
BEFORE DELETE ON public.user_items
FOR EACH ROW EXECUTE FUNCTION public.guard_user_item_delete();

-- ---------------------------------------------------------------------------
-- 9. 期限切れとお知らせ
-- ---------------------------------------------------------------------------

-- 返事のない申請は14日で取り下げる。承認後に7日動きがない取引は、当事者にお知らせする（1回だけ）。
CREATE OR REPLACE FUNCTION public.expire_stale_trades()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.trade_requests
  SET status = 'cancelled', cancelled_at = now(), cancel_reason = 'expired'
  WHERE status = 'pending'
    AND COALESCE(is_open, false) = false
    AND created_at < now() - interval '14 days';

  WITH n AS (
    UPDATE public.trade_requests
    SET nudged_at = now()
    WHERE status = 'accepted'
      AND nudged_at IS NULL
      AND COALESCE(is_open, false) = false
      AND COALESCE(responded_at, created_at) < now() - interval '7 days'
    RETURNING id, sender_id, receiver_id
  )
  INSERT INTO public.notifications (user_id, title, message, type, data)
  SELECT u.uid, '交換が止まっています',
         '承認から7日たっています。発送や受け取りの報告がまだなら、相手とやり取りして進めましょう',
         'trade_nudge',
         jsonb_build_object('trade_id', n.id, 'url', '/search?tab=trade')
  FROM n, LATERAL (VALUES (n.sender_id), (n.receiver_id)) AS u(uid);
END;
$$;

REVOKE ALL ON FUNCTION public.expire_stale_trades() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('expire-stale-trades', '15 18 * * *', 'SELECT public.expire_stale_trades()');
  END IF;
END $$;
