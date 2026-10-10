-- ポイントの付け方を「追加」から「交流」へ。
--  ・グッズ追加の +1pt はやめる（過去に付与した分はそのまま）
--  ・投稿 / コメント / 反応をもらった / 交換が完了した、で付与する
-- 付与はすべてサーバー側のトリガーで行い、クライアントからは請求できない。
-- 1日の上限は日本時間の日付で数える。

UPDATE public.point_rewards SET is_active = false WHERE reason = 'item_add';

INSERT INTO public.point_rewards (reason, points, transaction_type, description, once_per_reference, once_per_user, is_active) VALUES
  ('post_create',       3,  'post_create',       '投稿',                 true, false, true),
  ('post_comment',      1,  'post_comment',      'コメント',             true, false, true),
  ('reaction_received', 1,  'reaction_received', '投稿への反応',         true, false, true),
  ('trade_completed',   10, 'trade_completed',   '交換の完了',           true, false, true)
ON CONFLICT (reason) DO NOTHING;

-- トリガーからだけ呼ぶ内部関数。reason ごとに「1日の上限」を超えたら何もしない。
CREATE OR REPLACE FUNCTION public.award_social_points(_user_id uuid, _reason text, _reference_id uuid, _daily_cap integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _r public.point_rewards%ROWTYPE;
  _day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo';
  _today integer;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  SELECT * INTO _r FROM public.point_rewards WHERE reason = _reason AND is_active;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT count(*) INTO _today FROM public.point_reward_claims
   WHERE user_id = _user_id AND reason = _reason AND created_at >= _day_start;
  IF _today >= _daily_cap THEN RETURN; END IF;

  INSERT INTO public.point_reward_claims (user_id, reason, reference_id)
  VALUES (_user_id, _reason, _reference_id)
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;

  PERFORM public.grant_points_internal(_user_id, _r.points, _r.transaction_type, _r.description, _reference_id);
END;
$$;
REVOKE ALL ON FUNCTION public.award_social_points(uuid, text, uuid, integer) FROM PUBLIC, anon, authenticated;

-- 投稿（新しい投稿 item_posts と、従来の goods_posts）: 1日3回まで
CREATE OR REPLACE FUNCTION public.award_points_on_post() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.award_social_points(NEW.user_id, 'post_create', NEW.id, 3);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.award_points_on_post() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS award_points_on_item_post ON public.item_posts;
CREATE TRIGGER award_points_on_item_post AFTER INSERT ON public.item_posts
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_post();
DROP TRIGGER IF EXISTS award_points_on_goods_post ON public.goods_posts;
CREATE TRIGGER award_points_on_goods_post AFTER INSERT ON public.goods_posts
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_post();

-- コメント: 他の人の投稿へのコメントだけ。1日5回まで
CREATE OR REPLACE FUNCTION public.award_points_on_comment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _author uuid;
BEGIN
  IF TG_TABLE_NAME = 'item_post_comments' THEN
    SELECT user_id INTO _author FROM public.item_posts WHERE id = NEW.post_id;
  ELSE
    SELECT user_id INTO _author FROM public.goods_posts WHERE id = NEW.post_id;
  END IF;
  IF _author IS NOT NULL AND _author <> NEW.user_id THEN
    PERFORM public.award_social_points(NEW.user_id, 'post_comment', NEW.id, 5);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.award_points_on_comment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS award_points_on_item_post_comment ON public.item_post_comments;
CREATE TRIGGER award_points_on_item_post_comment AFTER INSERT ON public.item_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_comment();
DROP TRIGGER IF EXISTS award_points_on_post_comment ON public.post_comments;
CREATE TRIGGER award_points_on_post_comment AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_comment();

-- 反応（いいね・持ってる/ほしい）をもらった投稿者へ。自分への反応は対象外。同じ人・同じ投稿は1回だけ。1日10回まで
CREATE OR REPLACE FUNCTION public.award_points_on_reaction() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _author uuid;
BEGIN
  IF TG_TABLE_NAME = 'post_likes' THEN
    SELECT user_id INTO _author FROM public.goods_posts WHERE id = NEW.post_id;
  ELSE
    SELECT user_id INTO _author FROM public.item_posts WHERE id = NEW.post_id;
  END IF;
  IF _author IS NOT NULL AND _author <> NEW.user_id THEN
    PERFORM public.award_social_points(_author, 'reaction_received', md5('reaction:' || NEW.post_id || ':' || NEW.user_id)::uuid, 10);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.award_points_on_reaction() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS award_points_on_item_post_like ON public.item_post_likes;
CREATE TRIGGER award_points_on_item_post_like AFTER INSERT ON public.item_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_reaction();
DROP TRIGGER IF EXISTS award_points_on_item_post_reaction ON public.item_post_reactions;
CREATE TRIGGER award_points_on_item_post_reaction AFTER INSERT ON public.item_post_reactions
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_reaction();
DROP TRIGGER IF EXISTS award_points_on_post_like ON public.post_likes;
CREATE TRIGGER award_points_on_post_like AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_reaction();

-- 交換が完了したとき、双方に。1日3回まで
CREATE OR REPLACE FUNCTION public.award_points_on_trade_completed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    PERFORM public.award_social_points(NEW.sender_id, 'trade_completed', NEW.id, 3);
    PERFORM public.award_social_points(NEW.receiver_id, 'trade_completed', NEW.id, 3);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.award_points_on_trade_completed() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS award_points_on_trade_completed ON public.trade_requests;
CREATE TRIGGER award_points_on_trade_completed AFTER UPDATE ON public.trade_requests
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_trade_completed();
