-- Add UPDATE policy for tags so that linking (setting content_id/category) works
-- SECURITY: restrict to admins only, consistent with delete/insert admin policies
CREATE POLICY "Admin only tags update"
ON public.tags
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  )
);
