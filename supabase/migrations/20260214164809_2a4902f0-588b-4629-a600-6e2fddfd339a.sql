
-- ============================================
-- 1. item_tags: Fix overly permissive policies
-- ============================================

-- Drop problematic policies
DROP POLICY IF EXISTS "Anyone can create item tags" ON public.item_tags;
DROP POLICY IF EXISTS "Authenticated users can delete item tags" ON public.item_tags;
DROP POLICY IF EXISTS "Authenticated users can update item tags" ON public.item_tags;

-- Recreate with proper restrictions
CREATE POLICY "Authenticated users can create item tags"
ON public.item_tags
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update item tags"
ON public.item_tags
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Keep the existing admin delete policy, no changes needed

-- ============================================
-- 2. official_items: Fix INSERT policy
-- ============================================

DROP POLICY IF EXISTS "Users can add official items" ON public.official_items;

CREATE POLICY "Authenticated users can add official items"
ON public.official_items
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 3. original_item_tags: Fix INSERT policy
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can insert original item tags" ON public.original_item_tags;

CREATE POLICY "Authenticated users can insert original item tags"
ON public.original_item_tags
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 4. notifications: Restrict INSERT to service role only
-- Triggers use SECURITY DEFINER and bypass RLS, so
-- we remove the permissive INSERT policy for anon/authenticated
-- ============================================

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- No INSERT policy needed for authenticated users since
-- notifications are created by SECURITY DEFINER triggers.
-- If client-side notification creation is needed, add a specific policy.
