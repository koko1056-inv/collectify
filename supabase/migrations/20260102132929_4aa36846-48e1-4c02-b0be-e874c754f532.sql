-- Fix infinite recursion: avoid referencing admin_accounts (its RLS self-references)
DROP POLICY IF EXISTS "Admin only tags update" ON public.tags;

CREATE POLICY "Admin only tags update"
ON public.tags
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  )
);
