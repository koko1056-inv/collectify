ALTER FUNCTION public.can_review_trade(uuid, uuid, uuid) SET search_path = public;
ALTER FUNCTION public.can_send_stamp(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.can_access_item_room(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.on_item_room_message_insert() SET search_path = public;