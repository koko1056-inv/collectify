-- Track which onboarding steps a user has already been rewarded for
CREATE TABLE public.onboarding_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  step_id text NOT NULL,
  points_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, step_id)
);

ALTER TABLE public.onboarding_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_onboarding_rewards"
ON public.onboarding_rewards
FOR SELECT
USING (auth.uid() = user_id);

-- Server-side function: idempotently award points for an onboarding step
CREATE OR REPLACE FUNCTION public.claim_onboarding_reward(
  _step_id text,
  _points integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _inserted boolean := false;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _points <= 0 THEN
    RETURN false;
  END IF;

  -- Try to insert; if it conflicts, the user already claimed this step
  INSERT INTO public.onboarding_rewards (user_id, step_id, points_awarded)
  VALUES (_user_id, _step_id, _points)
  ON CONFLICT (user_id, step_id) DO NOTHING
  RETURNING true INTO _inserted;

  IF _inserted IS NULL OR _inserted = false THEN
    RETURN false;
  END IF;

  -- Award points using the existing helper
  PERFORM public.add_user_points(
    _user_id,
    _points,
    'onboarding_reward',
    'はじめのステップ達成: ' || _step_id,
    NULL
  );

  RETURN true;
END;
$$;