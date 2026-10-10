-- 「あなたのグッズをほしがっている人」から先へ進めるための材料。
--
-- find_trade_matches の their_items は「相手が交換に出している ∩ 自分の欲しい」だけなので、
-- 相手が自分の品を欲しがっているだけの片想いでは空になり、
-- 「代わりに何をもらえるのか」が画面に出ず、申し込みまで進めなかった。
--
-- get_trade_partner_items は、指定した相手たちの持ち物を返す。
--   _only_for_trade = true  : 交換に出している品だけ（相手ごとに最大24件）。一覧の「代わりにもらえるもの」用
--   _only_for_trade = false : コレクション全体（1人ずつ、最大200件）。交換に出していない相手に相談するとき用
-- どちらも、別の交換で成立済み（承認済み）の品は除く（申し込んでも通らないため）。
-- ブロック関係の相手は返さない。コレクション全体は、公開設定（public／フォロー中の followers）を守る。

CREATE OR REPLACE FUNCTION public.get_trade_partner_items(
  _partner_ids uuid[],
  _only_for_trade boolean DEFAULT true
)
RETURNS TABLE(
  partner_id uuid,
  item_id uuid,
  title text,
  image text,
  for_trade boolean,
  already_requested boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH hidden AS (
    SELECT b.blocked_id AS uid FROM public.user_blocks b WHERE b.blocker_id = auth.uid()
    UNION
    SELECT b.blocker_id AS uid FROM public.user_blocks b WHERE b.blocked_id = auth.uid()
  ),
  ids AS (
    -- 一度に見る相手は30人まで（交換タブの片想いの件数に合わせる）
    SELECT DISTINCT x AS pid
    FROM unnest(COALESCE(_partner_ids, '{}'::uuid[])) AS x
    LIMIT CASE WHEN COALESCE(_only_for_trade, true) THEN 30 ELSE 1 END
  )
  SELECT
    p.pid,
    it.id,
    it.title,
    it.image,
    it.for_trade,
    EXISTS (
      SELECT 1 FROM public.trade_requests tr
      WHERE tr.sender_id = auth.uid() AND tr.requested_item_id = it.id
        AND tr.status IN ('pending', 'accepted')
    )
  FROM ids p
  JOIN public.profiles pr ON pr.id = p.pid
  CROSS JOIN LATERAL (
    SELECT ui.id, ui.title, ui.image, ui.for_trade
    FROM public.user_items ui
    WHERE ui.user_id = p.pid
      AND (ui.for_trade OR NOT COALESCE(_only_for_trade, true))
      AND NOT public.trade_item_in_progress(ui.id)
    ORDER BY ui.for_trade DESC, ui.created_at DESC
    LIMIT CASE WHEN COALESCE(_only_for_trade, true) THEN 24 ELSE 200 END
  ) it
  WHERE auth.uid() IS NOT NULL
    AND p.pid <> auth.uid()
    AND p.pid NOT IN (SELECT h.uid FROM hidden h)
    AND (
      COALESCE(_only_for_trade, true)
      OR pr.privacy_level::text = 'public'
      OR (pr.privacy_level::text = 'followers' AND EXISTS (
            SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = pr.id))
    );
$function$;

REVOKE ALL ON FUNCTION public.get_trade_partner_items(uuid[], boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trade_partner_items(uuid[], boolean) TO authenticated;

-- 申請が届いたときの通知の文面。
-- 以前は「◯◯さんから、「A」に「B」での交換申請です」で、どちらが自分の品なのか読み取れなかった。
-- 「相手は B を出して、あなたの A をほしがっている」と、立場が分かる形にする。
-- あわせて、通知の飛び先を旧URL（/search?tab=trade）から /trade に直す。
CREATE OR REPLACE FUNCTION public.notify_trade_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  base := jsonb_build_object('trade_id', NEW.id, 'url', '/trade');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, message, type, data)
    VALUES (NEW.receiver_id, '交換の申請が届きました',
            COALESCE(s_name, '誰か') || 'さんは「' || off_t || '」を出して、あなたの「' || req_t || '」をほしがっています',
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
$function$;

REVOKE ALL ON FUNCTION public.notify_trade_event() FROM PUBLIC, anon, authenticated;
