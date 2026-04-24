-- ========================================
-- 1. 信頼スコア（3カテゴリ独立）
-- ========================================
CREATE TABLE public.user_trust_scores (
  user_id uuid PRIMARY KEY,
  trade_score numeric NOT NULL DEFAULT 0,
  trade_count integer NOT NULL DEFAULT 0,
  collector_score numeric NOT NULL DEFAULT 0,
  collector_count integer NOT NULL DEFAULT 0,
  communication_score numeric NOT NULL DEFAULT 0,
  communication_count integer NOT NULL DEFAULT 0,
  reports_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trust_scores_select_all"
  ON public.user_trust_scores FOR SELECT
  USING (true);

-- 既存ユーザーに初期レコードを挿入
INSERT INTO public.user_trust_scores (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- 新規プロフィール作成時に自動でレコード作成
CREATE OR REPLACE FUNCTION public.ensure_trust_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_trust_scores (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_trust_score_on_profile_insert
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_trust_score();

-- 信頼スコア更新の安全な関数（クライアントから直接UPDATEできない）
CREATE OR REPLACE FUNCTION public.update_trust_score(
  _user_id uuid,
  _category text,  -- 'trade'|'collector'|'communication'
  _delta numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 必ずレコードを存在させる
  INSERT INTO public.user_trust_scores (user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  IF _category = 'trade' THEN
    UPDATE public.user_trust_scores
      SET trade_score = trade_score + _delta,
          trade_count = trade_count + 1,
          updated_at = now()
      WHERE user_id = _user_id;
  ELSIF _category = 'collector' THEN
    UPDATE public.user_trust_scores
      SET collector_score = collector_score + _delta,
          collector_count = collector_count + 1,
          updated_at = now()
      WHERE user_id = _user_id;
  ELSIF _category = 'communication' THEN
    UPDATE public.user_trust_scores
      SET communication_score = communication_score + _delta,
          communication_count = communication_count + 1,
          updated_at = now()
      WHERE user_id = _user_id;
  END IF;
END;
$$;

-- ========================================
-- 2. トレード相互評価
-- ========================================
CREATE TABLE public.trade_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_request_id uuid NOT NULL REFERENCES public.trade_requests(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  reviewee_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trade_request_id, reviewer_id)
);

ALTER TABLE public.trade_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trade_reviews_select_all"
  ON public.trade_reviews FOR SELECT
  USING (true);

-- 完了済トレードの当事者のみ評価可能
CREATE OR REPLACE FUNCTION public.can_review_trade(_trade_id uuid, _reviewer uuid, _reviewee uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trade_requests
    WHERE id = _trade_id
      AND status = 'completed'
      AND (
        (sender_id = _reviewer AND receiver_id = _reviewee)
        OR (receiver_id = _reviewer AND sender_id = _reviewee)
      )
  );
$$;

CREATE POLICY "trade_reviews_insert_completed_party"
  ON public.trade_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND public.can_review_trade(trade_request_id, reviewer_id, reviewee_id)
  );

-- 評価が入ったら相手の取引信頼度を更新
CREATE OR REPLACE FUNCTION public.on_trade_review_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1〜5を-2〜+2の範囲に変換して加算（3が中立）
  PERFORM public.update_trust_score(NEW.reviewee_id, 'trade', (NEW.rating - 3)::numeric);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trade_review_score
AFTER INSERT ON public.trade_reviews
FOR EACH ROW
EXECUTE FUNCTION public.on_trade_review_insert();

CREATE INDEX idx_trade_reviews_reviewee ON public.trade_reviews(reviewee_id);
CREATE INDEX idx_trade_reviews_trade ON public.trade_reviews(trade_request_id);

-- ========================================
-- 3. グッズコメント
-- ========================================
CREATE TABLE public.item_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  official_item_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.item_comments(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 1000),
  helpful_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.item_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "item_comments_select_all"
  ON public.item_comments FOR SELECT USING (true);

CREATE POLICY "item_comments_insert_own"
  ON public.item_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "item_comments_update_own"
  ON public.item_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "item_comments_delete_own"
  ON public.item_comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_item_comments_item ON public.item_comments(official_item_id, created_at DESC);
CREATE INDEX idx_item_comments_parent ON public.item_comments(parent_id);

CREATE TRIGGER update_item_comments_updated_at
BEFORE UPDATE ON public.item_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- リアクション
CREATE TABLE public.item_comment_reactions (
  comment_id uuid NOT NULL REFERENCES public.item_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction text NOT NULL CHECK (reaction IN ('helpful','love','agree')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id, reaction)
);

ALTER TABLE public.item_comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "item_comment_reactions_select_all"
  ON public.item_comment_reactions FOR SELECT USING (true);

CREATE POLICY "item_comment_reactions_insert_own"
  ON public.item_comment_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "item_comment_reactions_delete_own"
  ON public.item_comment_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- helpfulリアクションでコメント投稿者のコレクター信頼度を更新
CREATE OR REPLACE FUNCTION public.on_comment_reaction_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _author uuid;
BEGIN
  IF NEW.reaction = 'helpful' THEN
    UPDATE public.item_comments
      SET helpful_count = helpful_count + 1
      WHERE id = NEW.comment_id
      RETURNING user_id INTO _author;
    -- 自己リアクションは除外
    IF _author IS NOT NULL AND _author <> NEW.user_id THEN
      PERFORM public.update_trust_score(_author, 'collector', 1);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_comment_reaction_helpful
AFTER INSERT ON public.item_comment_reactions
FOR EACH ROW
EXECUTE FUNCTION public.on_comment_reaction_insert();

-- ========================================
-- 4. あいさつスタンプ
-- ========================================
CREATE TABLE public.greeting_stamps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  stamp_type text NOT NULL CHECK (stamp_type IN (
    'same_oshi','nice_goods','congrats','trade_interest','helpful','hello'
  )),
  context_type text CHECK (context_type IN ('item','profile','match','comment')),
  context_id uuid,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id <> receiver_id)
);

ALTER TABLE public.greeting_stamps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "greeting_stamps_select_party"
  ON public.greeting_stamps FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 24時間内重複送信防止
CREATE OR REPLACE FUNCTION public.can_send_stamp(_sender uuid, _receiver uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.greeting_stamps
    WHERE sender_id = _sender
      AND receiver_id = _receiver
      AND created_at > now() - interval '24 hours'
  );
$$;

CREATE POLICY "greeting_stamps_insert_throttled"
  ON public.greeting_stamps FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND public.can_send_stamp(sender_id, receiver_id)
  );

-- 受信側が返信フラグを更新できる
CREATE POLICY "greeting_stamps_update_receiver"
  ON public.greeting_stamps FOR UPDATE
  USING (auth.uid() = receiver_id);

CREATE INDEX idx_greeting_stamps_receiver ON public.greeting_stamps(receiver_id, created_at DESC);
CREATE INDEX idx_greeting_stamps_sender ON public.greeting_stamps(sender_id, created_at DESC);

-- スタンプが届いたら通知作成
CREATE OR REPLACE FUNCTION public.on_stamp_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.receiver_id,
    'greeting_stamp',
    'あいさつスタンプが届きました',
    NULL,
    jsonb_build_object(
      'stamp_id', NEW.id,
      'sender_id', NEW.sender_id,
      'stamp_type', NEW.stamp_type,
      'context_type', NEW.context_type,
      'context_id', NEW.context_id
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stamp_notify
AFTER INSERT ON public.greeting_stamps
FOR EACH ROW
EXECUTE FUNCTION public.on_stamp_insert();

-- 返信されたら送信者のコミュニケーション信頼度を加点
CREATE OR REPLACE FUNCTION public.on_stamp_replied()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.replied_at IS NULL AND NEW.replied_at IS NOT NULL THEN
    PERFORM public.update_trust_score(NEW.sender_id, 'communication', 1);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stamp_replied
AFTER UPDATE ON public.greeting_stamps
FOR EACH ROW
EXECUTE FUNCTION public.on_stamp_replied();

-- ========================================
-- 5. 同担マッチング
-- ========================================
CREATE TABLE public.match_scores (
  user_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  shared_interests integer NOT NULL DEFAULT 0,
  shared_items integer NOT NULL DEFAULT 0,
  tradeable_items integer NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, candidate_id),
  CHECK (user_id <> candidate_id)
);

ALTER TABLE public.match_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_scores_select_own"
  ON public.match_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_match_scores_user_score ON public.match_scores(user_id, score DESC);

CREATE TABLE public.match_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('interested','skip')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, candidate_id),
  CHECK (user_id <> candidate_id)
);

ALTER TABLE public.match_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_actions_select_party"
  ON public.match_actions FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = candidate_id);

CREATE POLICY "match_actions_insert_own"
  ON public.match_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 相互"interested"成立で自動フォロー＋マッチ通知
CREATE OR REPLACE FUNCTION public.on_match_action_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _mutual boolean;
BEGIN
  IF NEW.action = 'interested' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.match_actions
      WHERE user_id = NEW.candidate_id
        AND candidate_id = NEW.user_id
        AND action = 'interested'
    ) INTO _mutual;

    IF _mutual THEN
      -- 相互フォロー
      INSERT INTO public.follows (follower_id, following_id)
      VALUES (NEW.user_id, NEW.candidate_id)
      ON CONFLICT DO NOTHING;
      INSERT INTO public.follows (follower_id, following_id)
      VALUES (NEW.candidate_id, NEW.user_id)
      ON CONFLICT DO NOTHING;

      -- 双方に通知
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES
        (NEW.user_id, 'match_success', '同担マッチが成立しました🎉', NULL,
         jsonb_build_object('matched_user_id', NEW.candidate_id)),
        (NEW.candidate_id, 'match_success', '同担マッチが成立しました🎉', NULL,
         jsonb_build_object('matched_user_id', NEW.user_id));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_match_action_mutual
AFTER INSERT ON public.match_actions
FOR EACH ROW
EXECUTE FUNCTION public.on_match_action_insert();

-- ========================================
-- 6. グッズ別チャットルーム
-- ========================================
CREATE TABLE public.item_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  official_item_id uuid UNIQUE NOT NULL,
  member_count integer NOT NULL DEFAULT 0,
  message_count integer NOT NULL DEFAULT 0,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.item_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "item_rooms_select_all"
  ON public.item_rooms FOR SELECT USING (true);

-- 入室判定ヘルパー（所有 or ウィッシュ）
CREATE OR REPLACE FUNCTION public.can_access_item_room(_user uuid, _official_item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_items
    WHERE user_id = _user AND official_item_id = _official_item_id
  ) OR EXISTS (
    SELECT 1 FROM public.wishlists
    WHERE user_id = _user AND official_item_id = _official_item_id
  );
$$;

-- ルームメッセージ
CREATE TABLE public.item_room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.item_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.item_room_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "item_room_messages_select_member"
  ON public.item_room_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.item_rooms r
      WHERE r.id = item_room_messages.room_id
        AND public.can_access_item_room(auth.uid(), r.official_item_id)
    )
  );

CREATE POLICY "item_room_messages_insert_member"
  ON public.item_room_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.item_rooms r
      WHERE r.id = item_room_messages.room_id
        AND public.can_access_item_room(auth.uid(), r.official_item_id)
    )
  );

CREATE POLICY "item_room_messages_delete_own"
  ON public.item_room_messages FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_item_room_messages_room ON public.item_room_messages(room_id, created_at DESC);

-- 投稿時にルーム統計更新
CREATE OR REPLACE FUNCTION public.on_item_room_message_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.item_rooms
    SET message_count = message_count + 1,
        last_active_at = now()
    WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_item_room_message_stats
AFTER INSERT ON public.item_room_messages
FOR EACH ROW
EXECUTE FUNCTION public.on_item_room_message_insert();

-- Realtime配信
ALTER PUBLICATION supabase_realtime ADD TABLE public.item_room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.greeting_stamps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_actions;