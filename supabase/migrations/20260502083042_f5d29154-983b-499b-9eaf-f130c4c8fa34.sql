-- 30pt消費でコレクション枠+10
CREATE OR REPLACE FUNCTION public.expand_collection_slots(_cost integer DEFAULT 30, _slots_added integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _current integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _cost <= 0 OR _slots_added <= 0 THEN RAISE EXCEPTION 'Invalid parameters'; END IF;

  SELECT COALESCE(total_points, 0) INTO _current
  FROM public.user_points WHERE user_id = _uid FOR UPDATE;

  IF COALESCE(_current, 0) < _cost THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  -- ensure user_limits row
  INSERT INTO public.user_limits (user_id) VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_limits
    SET collection_slots = COALESCE(collection_slots, 100) + _slots_added, updated_at = now()
    WHERE user_id = _uid;

  UPDATE public.user_points
    SET total_points = total_points - _cost, updated_at = now()
    WHERE user_id = _uid;

  INSERT INTO public.point_transactions (user_id, points, transaction_type, description)
  VALUES (_uid, -_cost, 'collection_slot_expand', 'コレクション枠 +' || _slots_added || ' 拡張');

  RETURN jsonb_build_object('success', true, 'new_points', _current - _cost);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.expand_collection_slots(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expand_collection_slots(integer, integer) TO authenticated;

-- 遡及ポイント計算 (content追加分の補填)
CREATE OR REPLACE FUNCTION public.retroactive_content_points()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _added integer := 0;
  _row RECORD;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  FOR _row IN
    SELECT c.id, c.created_at
    FROM public.user_contents c
    WHERE c.user_id = _uid
      AND NOT EXISTS (
        SELECT 1 FROM public.point_transactions pt
        WHERE pt.user_id = _uid
          AND pt.transaction_type = 'content_add'
          AND pt.reference_id = c.id
      )
  LOOP
    INSERT INTO public.point_transactions (user_id, points, transaction_type, description, reference_id, created_at)
    VALUES (_uid, 10, 'content_add', 'コンテンツ追加（遡及）', _row.id, _row.created_at);
    _added := _added + 10;
  END LOOP;

  IF _added > 0 THEN
    INSERT INTO public.user_points (user_id, total_points)
    VALUES (_uid, _added)
    ON CONFLICT (user_id) DO UPDATE
      SET total_points = user_points.total_points + _added, updated_at = now();
  END IF;

  RETURN jsonb_build_object('points_added', _added);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.retroactive_content_points() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retroactive_content_points() TO authenticated;