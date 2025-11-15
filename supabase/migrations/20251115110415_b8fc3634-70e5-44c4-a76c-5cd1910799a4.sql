-- Remove problematic admin_accounts policy for item_tags
DROP POLICY IF EXISTS "Enable delete for admins" ON public.item_tags;

-- Create new policy using profiles.is_admin instead
CREATE POLICY "Admins can delete item tags"
ON public.item_tags
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);