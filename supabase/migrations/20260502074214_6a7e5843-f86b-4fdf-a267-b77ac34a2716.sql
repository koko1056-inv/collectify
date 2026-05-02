-- Add caller verification to prevent users from manipulating others' points
CREATE OR REPLACE FUNCTION public.add_user_points(_user_id uuid, _points integer, _transaction_type text, _description text DEFAULT NULL::text, _reference_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Security: only allow callers to modify their own points (unless invoked via service_role)
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Permission denied: cannot modify another user''s points';
  END IF;

  -- Upsert user_points
  INSERT INTO public.user_points (user_id, total_points)
  VALUES (_user_id, _points)
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_points = user_points.total_points + _points,
    updated_at = now();

  -- Record the transaction
  INSERT INTO public.point_transactions (user_id, points, transaction_type, description, reference_id)
  VALUES (_user_id, _points, _transaction_type, _description, _reference_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_login_bonus(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _last_login_date date;
  _login_streak integer;
  _bonus_points integer;
BEGIN
  -- Security: only allow callers to claim their own bonus
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Permission denied: cannot claim another user''s login bonus';
  END IF;

  -- Check if user already claimed today
  SELECT last_login_bonus_date, login_streak INTO _last_login_date, _login_streak
  FROM public.user_points
  WHERE user_id = _user_id;

  IF _last_login_date = CURRENT_DATE THEN
    RETURN false; -- Already claimed
  END IF;

  -- Calculate streak
  IF _last_login_date = CURRENT_DATE - 1 THEN
    _login_streak := COALESCE(_login_streak, 0) + 1;
  ELSE
    _login_streak := 1;
  END IF;

  -- Bonus points based on streak (base 10)
  _bonus_points := 10;

  -- Upsert user_points with login info
  INSERT INTO public.user_points (user_id, total_points, last_login_bonus_date, login_streak, last_login_date)
  VALUES (_user_id, _bonus_points, CURRENT_DATE, _login_streak, CURRENT_DATE)
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_points = user_points.total_points + _bonus_points,
    last_login_bonus_date = CURRENT_DATE,
    login_streak = _login_streak,
    last_login_date = CURRENT_DATE,
    updated_at = now();

  -- Record transaction
  INSERT INTO public.point_transactions (user_id, points, transaction_type, description)
  VALUES (_user_id, _bonus_points, 'login_bonus', 'ログインボーナス (ストリーク: ' || _login_streak || ')');

  RETURN true;
END;
$function$;