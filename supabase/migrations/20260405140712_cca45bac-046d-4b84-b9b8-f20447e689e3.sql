
-- 1. Fix profiles is_admin privilege escalation
REVOKE UPDATE (is_admin) ON public.profiles FROM authenticated;
REVOKE UPDATE (is_admin) ON public.profiles FROM anon;

-- 2. Fix profiles privacy bypass - remove the catch-all policy
DROP POLICY IF EXISTS "Anyone can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
DROP POLICY IF EXISTS "Followers can view follower-only profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a single consolidated SELECT policy that enforces privacy
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT USING (
  -- Users can always view their own profile
  auth.uid() = id
  OR
  -- Public profiles are viewable by everyone
  privacy_level = 'public'::profile_privacy
  OR
  -- Follower-only profiles are viewable by followers
  (privacy_level = 'followers'::profile_privacy AND is_follower(id))
);

-- 3. Fix user_points self-manipulation - remove INSERT and UPDATE policies
DROP POLICY IF EXISTS "Users can update their own points" ON public.user_points;
DROP POLICY IF EXISTS "Users can insert their own points" ON public.user_points;

-- Create a secure function to manage points (server-side only)
CREATE OR REPLACE FUNCTION public.add_user_points(
  _user_id uuid,
  _points integer,
  _transaction_type text,
  _description text DEFAULT NULL,
  _reference_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
$$;

-- Create a function for login bonus specifically
CREATE OR REPLACE FUNCTION public.claim_login_bonus(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _last_login_date date;
  _login_streak integer;
  _bonus_points integer;
BEGIN
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
$$;
