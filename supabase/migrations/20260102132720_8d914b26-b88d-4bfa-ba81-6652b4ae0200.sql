-- Fix RLS: allow app admins (profiles.is_admin / admin_accounts) to UPDATE tags
DO $$
BEGIN
  -- Drop the existing policy that relies on has_role(), which may not match this app's admin model
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'tags' AND policyname = 'Admin only tags update (roles)'
  ) THEN
    EXECUTE 'DROP POLICY "Admin only tags update (roles)" ON public.tags';
  END IF;
END $$;

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
  OR EXISTS (
    SELECT 1
    FROM public.admin_accounts a
    WHERE a.id = auth.uid() AND a.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.admin_accounts a
    WHERE a.id = auth.uid() AND a.is_admin = true
  )
);
