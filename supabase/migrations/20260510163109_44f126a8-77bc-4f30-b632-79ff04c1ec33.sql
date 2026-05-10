
-- 1) Prevent privilege escalation via profile self-update
DROP POLICY IF EXISTS "Users can update own profile (non-privileged)" ON public.profiles;
CREATE POLICY "Users can update own profile (non-privileged)"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Restrictive policy: non-admins cannot flip is_admin
CREATE POLICY "Non-admins cannot change is_admin"
ON public.profiles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR is_admin IS NOT DISTINCT FROM (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid())
);

-- 2) kuji_images: restrict uploads to authenticated users
DROP POLICY IF EXISTS "Allow uploads during development" ON storage.objects;
CREATE POLICY "Authenticated users can upload to kuji_images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'kuji_images' AND auth.uid() IS NOT NULL);

-- 3) trade_requests: tighten "complete" update policy
DROP POLICY IF EXISTS "Users can complete trades" ON public.trade_requests;
CREATE POLICY "Users can complete trades"
ON public.trade_requests
FOR UPDATE
TO authenticated
USING ((auth.uid() = sender_id) OR (auth.uid() = receiver_id))
WITH CHECK (
  ((auth.uid() = sender_id) OR (auth.uid() = receiver_id))
  AND status IN ('completed', 'accepted')
);

-- 4) user_items: restrict public read to authenticated users
DROP POLICY IF EXISTS "Anyone can view user items" ON public.user_items;
CREATE POLICY "Authenticated users can view user items"
ON public.user_items
FOR SELECT
TO authenticated
USING (true);

-- 5) follows: scope ALL policy to authenticated
DROP POLICY IF EXISTS "Users can follow/unfollow others" ON public.follows;
CREATE POLICY "Users can follow/unfollow others"
ON public.follows
FOR ALL
TO authenticated
USING (auth.uid() = follower_id)
WITH CHECK (auth.uid() = follower_id);
