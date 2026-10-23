CREATE OR REPLACE FUNCTION public.redeem_invite_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _invite RECORD;
  _bonus integer := 100;
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
