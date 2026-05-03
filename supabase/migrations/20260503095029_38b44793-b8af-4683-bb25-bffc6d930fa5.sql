
-- Fix overly broad SELECT policy on realtime.messages and public.messages
DROP POLICY IF EXISTS "Authenticated users can receive realtime messages" ON realtime.messages;

-- Add scoped search_path to functions missing it
ALTER FUNCTION public.update_item_posts_updated_at() SET search_path = public;
ALTER FUNCTION public.sync_item_post_like_count() SET search_path = public;
ALTER FUNCTION public.sync_item_post_comment_count() SET search_path = public;
ALTER FUNCTION public.update_room_furniture_updated_at() SET search_path = public;
