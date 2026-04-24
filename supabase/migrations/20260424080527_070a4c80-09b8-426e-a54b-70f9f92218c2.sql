
CREATE OR REPLACE FUNCTION public.get_or_create_item_room(_official_item_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _room_id uuid;
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.can_access_item_room(_uid, _official_item_id) THEN
    RAISE EXCEPTION 'You must own or wishlist this item to access its room';
  END IF;

  SELECT id INTO _room_id FROM public.item_rooms WHERE official_item_id = _official_item_id;

  IF _room_id IS NULL THEN
    INSERT INTO public.item_rooms (official_item_id) VALUES (_official_item_id)
    RETURNING id INTO _room_id;
  END IF;

  RETURN _room_id;
END;
$$;
