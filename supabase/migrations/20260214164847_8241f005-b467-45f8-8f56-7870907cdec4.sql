
-- Fix tags INSERT policy
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.tags;

CREATE POLICY "Authenticated users can insert tags"
ON public.tags
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
