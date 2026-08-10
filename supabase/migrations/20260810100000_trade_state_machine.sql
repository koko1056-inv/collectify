-- 交換の進み方を、サーバー側の1本の道筋にまとめる
--
-- これまでは trade_requests.status をクライアントから直に書き換えていて、
-- 「完了にする」処理が4箇所（取引一覧・完了モーダル・チャット・サービス層）に
-- 散らばっていた。RLS も片方の当事者が単独で completed に書ける状態で、
-- 相手が受け取る前に取引が終わったことにできてしまう。
--
-- 発送も受取も、本当に知っているのは自分の側だけ。
-- だから「自分の側だけを報告する」形に変えて、両方そろって初めて完了とする。
--
--   申請中(pending)
--     → 承認(accepted) …… 受け取った側だけが決められる
--     → 辞退(rejected)
--   承認後
--     → 各自が「発送した」を報告
--     → 相手の発送を確認したら「受け取った」を報告
--     → 両方が受け取ったら 完了(completed)
--   まだ何も送っていないうちは、どちらからでも 取消(cancelled)
--
-- 状態を変える口は下の4つの関数だけにして、UPDATE の権限は取り上げる。

-- ---------------------------------------------------------------------------
-- 1. 各自の報告を記録する列
-- ---------------------------------------------------------------------------

ALTER TABLE public.trade_requests
  ADD COLUMN IF NOT EXISTS sender_shipped_at    timestamptz,
  ADD COLUMN IF NOT EXISTS receiver_shipped_at  timestamptz,
  ADD COLUMN IF NOT EXISTS sender_received_at   timestamptz,
  ADD COLUMN IF NOT EXISTS receiver_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS responded_at         timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at         timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at         timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by         uuid;

COMMENT ON COLUMN public.trade_requests.sender_shipped_at IS
  '申し込んだ側が「発送した」と報告した時刻。相手は代わりに報告できない。';
COMMENT ON COLUMN public.trade_requests.receiver_received_at IS
  '申し込まれた側が「受け取った」と報告した時刻。両方そろうと完了になる。';

-- 既に完了している取引は、両方が受け取ったものとして辻褄を合わせておく
UPDATE public.trade_requests
SET completed_at         = COALESCE(completed_at, created_at),
    sender_shipped_at    = COALESCE(sender_shipped_at, created_at),
    receiver_shipped_at  = COALESCE(receiver_shipped_at, created_at),
    sender_received_at   = COALESCE(sender_received_at, created_at),
    receiver_received_at = COALESCE(receiver_received_at, created_at)
WHERE status = 'completed';

-- 発送済みのまま止まっている取引は、どちらが送ったか分からない。
-- 両方に印を付けると受取だけ待てばよくなるので、そこで辻褄を合わせる。
UPDATE public.trade_requests
SET sender_shipped_at   = COALESCE(sender_shipped_at, created_at),
    receiver_shipped_at = COALESCE(receiver_shipped_at, created_at)
WHERE status = 'accepted'
  AND shipping_status = 'shipped';

CREATE INDEX IF NOT EXISTS idx_trade_requests_sender_status
  ON public.trade_requests (sender_id, status);
CREATE INDEX IF NOT EXISTS idx_trade_requests_receiver_status
  ON public.trade_requests (receiver_id, status);

-- ---------------------------------------------------------------------------
-- 2. 状態を読み出す共通の形
-- ---------------------------------------------------------------------------

-- 画面に返す1件ぶんの状態。関数ごとに組み立てを書くと必ずずれるのでまとめる。
CREATE OR REPLACE FUNCTION public.trade_state_json(_row public.trade_requests)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'ok', true,
    'id', _row.id,
    'status', _row.status,
    'shipping_status', _row.shipping_status,
    'sender_shipped', _row.sender_shipped_at IS NOT NULL,
    'receiver_shipped', _row.receiver_shipped_at IS NOT NULL,
    'sender_received', _row.sender_received_at IS NOT NULL,
    'receiver_received', _row.receiver_received_at IS NOT NULL
  );
$$;

-- 失敗の理由はコード（英数字）で返す。画面側で日本語に直すため、
-- ここに表示用の文言は置かない。
CREATE OR REPLACE FUNCTION public.trade_error(_reason text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object('ok', false, 'reason', _reason);
$$;

-- ---------------------------------------------------------------------------
-- 3. 状態を変える4つの口
-- ---------------------------------------------------------------------------

-- 承認 / 辞退。決められるのは申し込まれた側だけ。
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

  UPDATE public.trade_requests
  SET status = CASE WHEN _accept THEN 'accepted' ELSE 'rejected' END,
      shipping_status = CASE WHEN _accept THEN 'not_shipped' ELSE shipping_status END,
      responded_at = now()
  WHERE id = _trade_id
  RETURNING * INTO t;

  RETURN public.trade_state_json(t);
END;
$$;

-- 取消。まだ誰も送っていないうちだけ。
-- 品物が動いたあとに片方の都合で無かったことにできると、
-- もう片方は送り損になる。
CREATE OR REPLACE FUNCTION public.cancel_trade_request(_trade_id uuid)
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
  IF auth.uid() IS DISTINCT FROM t.sender_id AND auth.uid() IS DISTINCT FROM t.receiver_id THEN
    RETURN public.trade_error('not_participant');
  END IF;
  IF t.status NOT IN ('pending', 'accepted') THEN
    RETURN public.trade_error('not_cancellable');
  END IF;
  IF t.sender_shipped_at IS NOT NULL OR t.receiver_shipped_at IS NOT NULL THEN
    RETURN public.trade_error('already_shipped');
  END IF;

  UPDATE public.trade_requests
  SET status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = auth.uid()
  WHERE id = _trade_id
  RETURNING * INTO t;

  RETURN public.trade_state_json(t);
END;
$$;

-- 「発送しました」。報告できるのは自分の側だけ。
CREATE OR REPLACE FUNCTION public.report_trade_shipment(_trade_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.trade_requests;
  is_sender boolean;
BEGIN
  SELECT * INTO t FROM public.trade_requests WHERE id = _trade_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN public.trade_error('not_found');
  END IF;

  is_sender := auth.uid() = t.sender_id;
  IF NOT is_sender AND auth.uid() IS DISTINCT FROM t.receiver_id THEN
    RETURN public.trade_error('not_participant');
  END IF;
  IF t.status <> 'accepted' THEN
    RETURN public.trade_error('not_accepted');
  END IF;
  IF (is_sender AND t.sender_shipped_at IS NOT NULL)
     OR (NOT is_sender AND t.receiver_shipped_at IS NOT NULL) THEN
    RETURN public.trade_error('already_reported');
  END IF;

  UPDATE public.trade_requests
  SET sender_shipped_at   = CASE WHEN is_sender THEN now() ELSE sender_shipped_at END,
      receiver_shipped_at = CASE WHEN is_sender THEN receiver_shipped_at ELSE now() END,
      -- 旧来の1本の shipping_status も、古い画面のために合わせておく
      shipping_status = 'shipped'
  WHERE id = _trade_id
  RETURNING * INTO t;

  RETURN public.trade_state_json(t);
END;
$$;

-- 「受け取りました」。相手が発送を報告してからでないと押せない。
-- 両方の受取がそろった時点で完了。
CREATE OR REPLACE FUNCTION public.report_trade_receipt(_trade_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.trade_requests;
  is_sender boolean;
  both_received boolean;
BEGIN
  SELECT * INTO t FROM public.trade_requests WHERE id = _trade_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN public.trade_error('not_found');
  END IF;

  is_sender := auth.uid() = t.sender_id;
  IF NOT is_sender AND auth.uid() IS DISTINCT FROM t.receiver_id THEN
    RETURN public.trade_error('not_participant');
  END IF;
  IF t.status <> 'accepted' THEN
    RETURN public.trade_error('not_accepted');
  END IF;
  -- 自分が受け取れるのは、相手が送ってくれたから
  IF (is_sender AND t.receiver_shipped_at IS NULL)
     OR (NOT is_sender AND t.sender_shipped_at IS NULL) THEN
    RETURN public.trade_error('partner_not_shipped');
  END IF;
  IF (is_sender AND t.sender_received_at IS NOT NULL)
     OR (NOT is_sender AND t.receiver_received_at IS NOT NULL) THEN
    RETURN public.trade_error('already_reported');
  END IF;

  both_received := CASE
    WHEN is_sender THEN t.receiver_received_at IS NOT NULL
    ELSE t.sender_received_at IS NOT NULL
  END;

  UPDATE public.trade_requests
  SET sender_received_at   = CASE WHEN is_sender THEN now() ELSE sender_received_at END,
      receiver_received_at = CASE WHEN is_sender THEN receiver_received_at ELSE now() END,
      status          = CASE WHEN both_received THEN 'completed' ELSE status END,
      shipping_status = CASE WHEN both_received THEN 'completed' ELSE shipping_status END,
      completed_at    = CASE WHEN both_received THEN now() ELSE completed_at END
  WHERE id = _trade_id
  RETURNING * INTO t;

  RETURN public.trade_state_json(t);
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_trade_request(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_trade_request(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.report_trade_shipment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.report_trade_receipt(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_to_trade_request(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_trade_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_trade_shipment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_trade_receipt(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. 直接 UPDATE する道を閉じる
-- ---------------------------------------------------------------------------

-- 上の関数を通さないと状態を変えられないようにする。
-- 特に "Users can complete trades" は、片方の当事者が単独で completed に
-- 書ける穴になっていた。
DROP POLICY IF EXISTS "Users can update received trade requests" ON public.trade_requests;
DROP POLICY IF EXISTS "Users can cancel their trade requests" ON public.trade_requests;
DROP POLICY IF EXISTS "Users can complete trades" ON public.trade_requests;

-- 申し込んだ本人が、まだ返事の来ていない募集を取り下げる（削除する）道は残す
DROP POLICY IF EXISTS "Senders can delete pending trade requests" ON public.trade_requests;
CREATE POLICY "Senders can delete pending trade requests"
ON public.trade_requests
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id AND status = 'pending');
