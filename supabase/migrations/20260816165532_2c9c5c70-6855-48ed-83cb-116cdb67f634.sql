UPDATE public.user_points SET total_points = 0 WHERE total_points < 0;

ALTER TABLE public.user_points DROP CONSTRAINT IF EXISTS user_points_total_points_non_negative;
ALTER TABLE public.user_points ADD CONSTRAINT user_points_total_points_non_negative CHECK (total_points >= 0);

CREATE OR REPLACE FUNCTION public.grant_points_internal(
  _user_id uuid,
  _points integer,
  _transaction_type text,
  _description text,
  _reference_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_points (user_id, total_points)
  VALUES (_user_id, GREATEST(_points, 0))
  ON CONFLICT (user_id) DO UPDATE
    SET total_points = user_points.total_points + _points,
        updated_at = now();

  INSERT INTO public.point_transactions (user_id, points, transaction_type, description, reference_id)
  VALUES (_user_id, _points, _transaction_type, _description, _reference_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.grant_points_internal(uuid, integer, text, text, uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.add_user_points(uuid, integer, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_user_points(uuid, integer, text, text, uuid)
  TO service_role;

CREATE TABLE IF NOT EXISTS public.point_rewards (
  reason text PRIMARY KEY,
  points integer NOT NULL CHECK (points > 0),
  transaction_type text NOT NULL,
  description text NOT NULL,
  once_per_reference boolean NOT NULL DEFAULT false,
  once_per_user boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.point_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "point_rewards_select" ON public.point_rewards;
CREATE POLICY "point_rewards_select" ON public.point_rewards
  FOR SELECT USING (true);

INSERT INTO public.point_rewards
  (reason, points, transaction_type, description, once_per_reference, once_per_user)
VALUES
  ('welcome_bonus',     50, 'welcome_bonus', 'ようこそボーナス',   false, true),
  ('item_add',           1, 'item_add',      'グッズ追加',         true,  false),
  ('official_item_add',  5, 'item_add',      '公式グッズ登録',     true,  false),
  ('content_add',       10, 'content_add',   'コンテンツ追加',     true,  false)
ON CONFLICT (reason) DO UPDATE SET
  points             = EXCLUDED.points,
  transaction_type   = EXCLUDED.transaction_type,
  description        = EXCLUDED.description,
  once_per_reference = EXCLUDED.once_per_reference,
  once_per_user      = EXCLUDED.once_per_user;

CREATE TABLE IF NOT EXISTS public.point_reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text NOT NULL REFERENCES public.point_rewards(reason),
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

DROP INDEX IF EXISTS public.point_reward_claims_unique;
CREATE UNIQUE INDEX point_reward_claims_unique
  ON public.point_reward_claims (user_id, reason, reference_id) NULLS NOT DISTINCT;

ALTER TABLE public.point_reward_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "point_reward_claims_select_own" ON public.point_reward_claims;
CREATE POLICY "point_reward_claims_select_own" ON public.point_reward_claims
  FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT ON public.point_rewards TO anon, authenticated;
GRANT SELECT ON public.point_reward_claims TO authenticated;
GRANT ALL ON public.point_rewards TO service_role;
GRANT ALL ON public.point_reward_claims TO service_role;

CREATE OR REPLACE FUNCTION public.claim_reward(
  _reason text,
  _reference_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _r RECORD;
  _claim_ref uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _r FROM public.point_rewards
   WHERE reason = _reason AND is_active;
  IF _r IS NULL THEN
    RAISE EXCEPTION 'Unknown reward: %', _reason;
  END IF;

  IF _r.once_per_reference AND _reference_id IS NULL THEN
    RAISE EXCEPTION 'reference_id is required for reward %', _reason;
  END IF;

  _claim_ref := CASE WHEN _r.once_per_user THEN NULL ELSE _reference_id END;

  INSERT INTO public.point_reward_claims (user_id, reason, reference_id)
  VALUES (_uid, _reason, _claim_ref)
  ON CONFLICT DO NOTHING;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  PERFORM public.grant_points_internal(
    _uid, _r.points, _r.transaction_type, _r.description, _reference_id
  );

  RETURN true;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_reward(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_reward(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_user_points_row()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_points (user_id, total_points)
  VALUES (_uid, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.ensure_user_points_row() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_points_row() TO authenticated;

CREATE TABLE IF NOT EXISTS public.onboarding_reward_steps (
  step_id text PRIMARY KEY,
  points integer NOT NULL CHECK (points > 0)
);

ALTER TABLE public.onboarding_reward_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "onboarding_reward_steps_select" ON public.onboarding_reward_steps;
CREATE POLICY "onboarding_reward_steps_select" ON public.onboarding_reward_steps
  FOR SELECT USING (true);

GRANT SELECT ON public.onboarding_reward_steps TO anon, authenticated;
GRANT ALL ON public.onboarding_reward_steps TO service_role;

INSERT INTO public.onboarding_reward_steps (step_id, points) VALUES
  ('account',    10),
  ('profile',    20),
  ('first-item', 30),
  ('favorites',  20),
  ('wishlist',   10),
  ('ai-room',    30),
  ('avatar',     30),
  ('follow',     10),
  ('bookmark',   10)
ON CONFLICT (step_id) DO UPDATE SET points = EXCLUDED.points;

DROP FUNCTION IF EXISTS public.claim_onboarding_reward(text, integer);

CREATE OR REPLACE FUNCTION public.claim_onboarding_reward(_step_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _points integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT points INTO _points
    FROM public.onboarding_reward_steps WHERE step_id = _step_id;
  IF _points IS NULL THEN
    RAISE EXCEPTION 'Unknown onboarding step: %', _step_id;
  END IF;

  INSERT INTO public.onboarding_rewards (user_id, step_id, points_awarded)
  VALUES (_uid, _step_id, _points)
  ON CONFLICT (user_id, step_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  PERFORM public.grant_points_internal(
    _uid, _points, 'onboarding_reward', 'はじめのステップ達成: ' || _step_id, NULL
  );

  RETURN true;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_onboarding_reward(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_onboarding_reward(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.redeem_invite_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _invite RECORD;
  _bonus integer := 50;
  _already_referred uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _invite FROM public.invite_codes
   WHERE code = _code FOR UPDATE;
  IF _invite IS NULL THEN
    RAISE EXCEPTION 'invite_not_found';
  END IF;
  IF _invite.creator_id = _uid THEN
    RAISE EXCEPTION 'invite_own_code';
  END IF;
  IF _invite.used_by IS NOT NULL THEN
    RAISE EXCEPTION 'invite_already_used';
  END IF;
  IF _invite.expires_at IS NOT NULL AND _invite.expires_at < now() THEN
    RAISE EXCEPTION 'invite_expired';
  END IF;

  SELECT referred_by INTO _already_referred FROM public.profiles WHERE id = _uid;
  IF _already_referred IS NOT NULL THEN
    RAISE EXCEPTION 'invite_already_redeemed';
  END IF;

  UPDATE public.invite_codes
     SET used_by = _uid, used_at = now()
   WHERE id = _invite.id;

  UPDATE public.profiles
     SET referred_by = _invite.creator_id
   WHERE id = _uid;

  PERFORM public.grant_points_internal(
    _invite.creator_id, _bonus, 'referral_bonus', '招待ボーナス', _invite.id
  );
  PERFORM public.grant_points_internal(
    _uid, _bonus, 'referral_bonus', '招待コード使用ボーナス', _invite.id
  );

  RETURN jsonb_build_object('success', true, 'points', _bonus, 'invite_id', _invite.id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.redeem_invite_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_invite_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_challenge(
  _title text,
  _ends_at timestamptz,
  _description text DEFAULT NULL,
  _image_url text DEFAULT NULL,
  _official_item_id uuid DEFAULT NULL,
  _first integer DEFAULT 100,
  _second integer DEFAULT 50,
  _third integer DEFAULT 30
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _pool integer;
  _current integer;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _title IS NULL OR btrim(_title) = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;
  IF _first < 0 OR _second < 0 OR _third < 0 THEN
    RAISE EXCEPTION 'Invalid prize amount';
  END IF;

  _pool := _first + _second + _third;
  IF _pool <= 0 THEN
    RAISE EXCEPTION 'Invalid prize amount';
  END IF;

  SELECT COALESCE(total_points, 0) INTO _current
    FROM public.user_points WHERE user_id = _uid FOR UPDATE;

  IF COALESCE(_current, 0) < _pool THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  INSERT INTO public.challenges (
    user_id, title, description, image_url, official_item_id, ends_at,
    first_place_points, second_place_points, third_place_points
  ) VALUES (
    _uid, _title, _description, _image_url, _official_item_id, _ends_at,
    _first, _second, _third
  ) RETURNING id INTO _id;

  UPDATE public.user_points
     SET total_points = total_points - _pool, updated_at = now()
   WHERE user_id = _uid;

  INSERT INTO public.point_transactions
    (user_id, points, transaction_type, description, reference_id)
  VALUES
    (_uid, -_pool, 'challenge_create', 'チャレンジ「' || _title || '」作成（賞金プール）', _id);

  RETURN _id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_challenge(text, timestamptz, text, text, uuid, integer, integer, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_challenge(text, timestamptz, text, text, uuid, integer, integer, integer)
  TO authenticated;

DROP FUNCTION IF EXISTS public.award_challenge_prize(uuid, uuid, integer, text);
DROP FUNCTION IF EXISTS public.deduct_points_for_challenge(integer, text);

CREATE OR REPLACE FUNCTION public.settle_challenge(_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _c RECORD;
  _pool integer;
  _awarded integer := 0;
  _place integer := 0;
  _prize integer;
  _rec RECORD;
  _winners jsonb := '[]'::jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _c FROM public.challenges WHERE id = _challenge_id FOR UPDATE;
  IF _c IS NULL THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;
  IF _c.user_id <> _uid THEN
    RAISE EXCEPTION 'Only the challenge owner can settle this challenge';
  END IF;
  IF _c.status <> 'active' THEN
    RAISE EXCEPTION 'Challenge already settled';
  END IF;

  _pool := COALESCE(_c.first_place_points, 0)
         + COALESCE(_c.second_place_points, 0)
         + COALESCE(_c.third_place_points, 0);

  FOR _rec IN
    SELECT e.user_id, COUNT(v.id) AS votes
      FROM public.challenge_entries e
      LEFT JOIN public.challenge_votes v ON v.entry_id = e.id
     WHERE e.challenge_id = _challenge_id
     GROUP BY e.id, e.user_id
    HAVING COUNT(v.id) > 0
     ORDER BY COUNT(v.id) DESC, e.id
     LIMIT 3
  LOOP
    _place := _place + 1;
    _prize := CASE _place
                WHEN 1 THEN COALESCE(_c.first_place_points, 0)
                WHEN 2 THEN COALESCE(_c.second_place_points, 0)
                ELSE COALESCE(_c.third_place_points, 0)
              END;

    CONTINUE WHEN _prize <= 0 OR _awarded + _prize > _pool;

    PERFORM public.grant_points_internal(
      _rec.user_id, _prize, 'challenge_reward',
      'チャレンジ「' || _c.title || '」' || _place || '位入賞',
      _challenge_id
    );
    _awarded := _awarded + _prize;
    _winners := _winners || jsonb_build_object(
      'user_id', _rec.user_id, 'place', _place, 'points', _prize, 'votes', _rec.votes
    );
  END LOOP;

  IF _pool - _awarded > 0 THEN
    PERFORM public.grant_points_internal(
      _uid, _pool - _awarded, 'challenge_refund',
      'チャレンジ「' || _c.title || '」未消化の賞金を返金',
      _challenge_id
    );
  END IF;

  UPDATE public.challenges
     SET status = 'ended', updated_at = now()
   WHERE id = _challenge_id;

  RETURN jsonb_build_object(
    'success', true,
    'awarded', _awarded,
    'refunded', _pool - _awarded,
    'winners', _winners
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.settle_challenge(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_challenge(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_custom_tag(
  _name text,
  _category text,
  _content_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _cost integer := 10;
  _current integer;
  _name_trimmed text := btrim(COALESCE(_name, ''));
  _tag RECORD;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _name_trimmed = '' THEN
    RAISE EXCEPTION 'tag_name_required';
  END IF;
  IF _category IS NULL OR _category = '' THEN
    RAISE EXCEPTION 'tag_category_required';
  END IF;

  IF EXISTS (SELECT 1 FROM public.tags WHERE lower(name) = lower(_name_trimmed)) THEN
    RAISE EXCEPTION 'tag_already_exists';
  END IF;

  SELECT COALESCE(total_points, 0) INTO _current
    FROM public.user_points WHERE user_id = _uid FOR UPDATE;

  IF COALESCE(_current, 0) < _cost THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  INSERT INTO public.tags (name, category, content_id)
  VALUES (
    _name_trimmed,
    _category,
    CASE WHEN _category IN ('character', 'series') THEN _content_id ELSE NULL END
  )
  RETURNING * INTO _tag;

  UPDATE public.user_points
     SET total_points = total_points - _cost, updated_at = now()
   WHERE user_id = _uid;

  INSERT INTO public.point_transactions
    (user_id, points, transaction_type, description, reference_id)
  VALUES
    (_uid, -_cost, 'custom_tag_create', 'カスタムタグ発行: ' || _name_trimmed, _tag.id);

  RETURN jsonb_build_object(
    'success', true,
    'tag_id', _tag.id,
    'name', _tag.name,
    'cost', _cost,
    'new_points', _current - _cost
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_custom_tag(text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_custom_tag(text, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.purchase_shop_item(_shop_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _item RECORD;
  _current_points integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _item FROM public.point_shop_items
   WHERE id = _shop_item_id AND is_active;
  IF _item IS NULL THEN
    RAISE EXCEPTION 'Shop item not found';
  END IF;

  SELECT COALESCE(total_points, 0) INTO _current_points
    FROM public.user_points WHERE user_id = _uid FOR UPDATE;

  IF COALESCE(_current_points, 0) < _item.points_cost THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  INSERT INTO public.user_limits (user_id) VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  IF _item.item_type = 'collection_slots' THEN
    UPDATE public.user_limits
      SET collection_slots = COALESCE(collection_slots, 100) + _item.value, updated_at = now()
      WHERE user_id = _uid;
  ELSIF _item.item_type = 'room_slot' THEN
    UPDATE public.user_limits
      SET room_slots = COALESCE(room_slots, 1) + _item.value, updated_at = now()
      WHERE user_id = _uid;
  ELSIF _item.item_type = 'custom_tags' THEN
    UPDATE public.user_limits
      SET custom_tag_slots = COALESCE(custom_tag_slots, 10) + _item.value, updated_at = now()
      WHERE user_id = _uid;
  ELSIF _item.item_type = 'group_create' THEN
    UPDATE public.user_limits
      SET group_create_count = COALESCE(group_create_count, 0) + _item.value, updated_at = now()
      WHERE user_id = _uid;
  ELSE
    NULL;
  END IF;

  UPDATE public.user_points
    SET total_points = total_points - _item.points_cost, updated_at = now()
    WHERE user_id = _uid;

  INSERT INTO public.point_transactions
    (user_id, points, transaction_type, description, reference_id)
  VALUES
    (_uid, -_item.points_cost, 'shop_purchase', _item.name || 'を購入', _item.id);

  INSERT INTO public.user_point_purchases (user_id, shop_item_id, points_spent)
  VALUES (_uid, _item.id, _item.points_cost);

  RETURN jsonb_build_object(
    'success', true,
    'new_points', _current_points - _item.points_cost,
    'item_name', _item.name
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.purchase_shop_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_shop_item(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.expand_collection_slots(
  _cost integer DEFAULT 30,
  _slots_added integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _current integer;
  _fixed_cost integer := 30;
  _fixed_slots integer := 10;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT COALESCE(total_points, 0) INTO _current
    FROM public.user_points WHERE user_id = _uid FOR UPDATE;

  IF COALESCE(_current, 0) < _fixed_cost THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  INSERT INTO public.user_limits (user_id) VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_limits
    SET collection_slots = COALESCE(collection_slots, 100) + _fixed_slots, updated_at = now()
    WHERE user_id = _uid;

  UPDATE public.user_points
    SET total_points = total_points - _fixed_cost, updated_at = now()
    WHERE user_id = _uid;

  INSERT INTO public.point_transactions (user_id, points, transaction_type, description)
  VALUES (_uid, -_fixed_cost, 'collection_slot_expand',
          'コレクション枠 +' || _fixed_slots || ' 拡張');

  RETURN jsonb_build_object('success', true, 'new_points', _current - _fixed_cost);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.expand_collection_slots(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expand_collection_slots(integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.retroactive_content_points()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retroactive_content_points() TO service_role;

CREATE OR REPLACE FUNCTION public.grant_eligible_achievements()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _total integer;
  _granted integer := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(total_points, 0) INTO _total
    FROM public.user_points WHERE user_id = _uid;
  _total := COALESCE(_total, 0);

  WITH action_counts AS (
    SELECT transaction_type, COUNT(*) AS n
      FROM public.point_transactions
     WHERE user_id = _uid AND points > 0
     GROUP BY transaction_type
  ),
  eligible AS (
    SELECT a.id
      FROM public.achievements a
     WHERE (a.required_points IS NOT NULL AND a.required_points <= _total)
        OR (a.required_action_count IS NOT NULL
            AND a.action_type IS NOT NULL
            AND COALESCE(
                  (SELECT n FROM action_counts WHERE transaction_type = a.action_type),
                  0
                ) >= a.required_action_count)
  )
  INSERT INTO public.user_achievements (user_id, achievement_id)
  SELECT _uid, e.id FROM eligible e
  ON CONFLICT (user_id, achievement_id) DO NOTHING;

  GET DIAGNOSTICS _granted = ROW_COUNT;
  RETURN _granted;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.grant_eligible_achievements() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_eligible_achievements() TO authenticated;

DROP FUNCTION IF EXISTS public.grant_achievement_if_eligible(uuid);