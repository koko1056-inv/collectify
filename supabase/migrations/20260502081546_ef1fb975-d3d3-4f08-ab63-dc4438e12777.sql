-- =========================================================
-- 1. point_transactions: revoke client INSERT, only server-side functions can write
-- =========================================================
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.point_transactions;
-- (SELECT policy "Users can view their own transactions" is preserved)

-- =========================================================
-- 2. user_achievements: revoke client INSERT, add server-side eligibility check
-- =========================================================
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;

CREATE OR REPLACE FUNCTION public.grant_achievement_if_eligible(_achievement_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _ach RECORD;
  _user_total_points integer;
  _action_count integer;
  _eligible boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Already granted?
  IF EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = _uid AND achievement_id = _achievement_id) THEN
    RETURN false;
  END IF;

  SELECT * INTO _ach FROM public.achievements WHERE id = _achievement_id;
  IF _ach IS NULL THEN
    RAISE EXCEPTION 'Achievement not found';
  END IF;

  -- Validate eligibility based on achievement type
  IF _ach.required_points IS NOT NULL THEN
    SELECT COALESCE(total_points, 0) INTO _user_total_points
    FROM public.user_points WHERE user_id = _uid;
    IF COALESCE(_user_total_points, 0) >= _ach.required_points THEN
      _eligible := true;
    END IF;
  END IF;

  IF NOT _eligible AND _ach.required_action_count IS NOT NULL THEN
    -- count user_items as a generic action proxy (matches existing logic)
    SELECT COUNT(*) INTO _action_count
    FROM public.user_items WHERE user_id = _uid;
    IF _action_count >= _ach.required_action_count THEN
      _eligible := true;
    END IF;
  END IF;

  IF NOT _eligible THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_achievements (user_id, achievement_id)
  VALUES (_uid, _achievement_id)
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.grant_achievement_if_eligible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_achievement_if_eligible(uuid) TO authenticated;

-- =========================================================
-- 3. user_limits: revoke client INSERT/UPDATE, route through purchase_shop_item
-- =========================================================
DROP POLICY IF EXISTS "Users can insert their own limits" ON public.user_limits;
DROP POLICY IF EXISTS "Users can update their own limits" ON public.user_limits;
-- (SELECT policy preserved)

-- Helper: ensure user_limits row exists for the caller
CREATE OR REPLACE FUNCTION public.ensure_user_limits_row()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.user_limits (user_id) VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.ensure_user_limits_row() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_limits_row() TO authenticated;

-- Atomic shop purchase: deduct points + apply limit increase + record purchase
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
  _new_points integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _item FROM public.shop_items WHERE id = _shop_item_id;
  IF _item IS NULL THEN
    RAISE EXCEPTION 'Shop item not found';
  END IF;

  -- Check & deduct points atomically
  SELECT COALESCE(total_points, 0) INTO _current_points
  FROM public.user_points WHERE user_id = _uid FOR UPDATE;

  IF COALESCE(_current_points, 0) < _item.points_cost THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  -- Ensure user_limits row exists
  INSERT INTO public.user_limits (user_id) VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  -- Apply limit increases based on item_type
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
    -- Unknown item types: just deduct points (e.g., consumables handled elsewhere)
    NULL;
  END IF;

  -- Deduct points + record transaction
  UPDATE public.user_points
    SET total_points = total_points - _item.points_cost, updated_at = now()
    WHERE user_id = _uid;

  INSERT INTO public.point_transactions (user_id, points, transaction_type, description, reference_id)
  VALUES (_uid, -_item.points_cost, 'shop_purchase', _item.name || 'を購入', _item.id);

  -- Record purchase history
  INSERT INTO public.user_point_purchases (user_id, shop_item_id, points_spent)
  VALUES (_uid, _item.id, _item.points_cost);

  _new_points := _current_points - _item.points_cost;

  RETURN jsonb_build_object(
    'success', true,
    'new_points', _new_points,
    'item_name', _item.name
  );
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.purchase_shop_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_shop_item(uuid) TO authenticated;

-- =========================================================
-- 4. Challenge prize functions (replace client-side point_transactions inserts)
-- =========================================================
CREATE OR REPLACE FUNCTION public.deduct_points_for_challenge(_total_prize integer, _description text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _current integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _total_prize <= 0 THEN RAISE EXCEPTION 'Invalid prize amount'; END IF;

  SELECT COALESCE(total_points, 0) INTO _current
  FROM public.user_points WHERE user_id = _uid FOR UPDATE;

  IF COALESCE(_current, 0) < _total_prize THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  UPDATE public.user_points
    SET total_points = total_points - _total_prize, updated_at = now()
    WHERE user_id = _uid;

  INSERT INTO public.point_transactions (user_id, points, transaction_type, description)
  VALUES (_uid, -_total_prize, 'challenge_create', _description);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.deduct_points_for_challenge(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deduct_points_for_challenge(integer, text) TO authenticated;

-- Award challenge prize (caller must own the challenge)
CREATE OR REPLACE FUNCTION public.award_challenge_prize(_challenge_id uuid, _winner_user_id uuid, _points integer, _description text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _owner uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _points <= 0 THEN RETURN; END IF;

  SELECT user_id INTO _owner FROM public.challenges WHERE id = _challenge_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Challenge not found'; END IF;
  IF _owner <> _uid THEN
    RAISE EXCEPTION 'Only the challenge owner can award prizes';
  END IF;

  -- Upsert winner points
  INSERT INTO public.user_points (user_id, total_points)
  VALUES (_winner_user_id, _points)
  ON CONFLICT (user_id) DO UPDATE
    SET total_points = user_points.total_points + _points, updated_at = now();

  INSERT INTO public.point_transactions (user_id, points, transaction_type, description, reference_id)
  VALUES (_winner_user_id, _points, 'challenge_reward', _description, _challenge_id);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.award_challenge_prize(uuid, uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_challenge_prize(uuid, uuid, integer, text) TO authenticated;

-- =========================================================
-- 5. binder_decorations: allow public read on public binder pages
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view decorations on public binder pages" ON public.binder_decorations;
CREATE POLICY "Anyone can view decorations on public binder pages"
ON public.binder_decorations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.binder_pages
    WHERE binder_pages.id = binder_decorations.binder_page_id
      AND binder_pages.is_public = true
  )
);