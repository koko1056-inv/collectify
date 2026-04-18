
-- 1) display_gallery: replace overly permissive SELECT with privacy-aware policy
DROP POLICY IF EXISTS "Anyone can view display galleries" ON public.display_gallery;
CREATE POLICY "View public or own display galleries"
ON public.display_gallery
FOR SELECT
TO authenticated
USING (is_public = true OR auth.uid() = user_id);

-- 2) profiles: prevent privilege escalation via is_admin column
-- Find existing UPDATE policies and replace with one that forbids changing is_admin / privileged columns
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'UPDATE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can update own profile (non-privileged)"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid())
);

CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) official_items: restrict UPDATE to admins or creator
DROP POLICY IF EXISTS "Users can update official items" ON public.official_items;
CREATE POLICY "Admins or creators can update official items"
ON public.official_items
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = created_by)
WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = created_by);

-- 4) realtime.messages: require authenticated session for any subscription
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'realtime' AND tablename = 'messages'
      AND policyname = 'Authenticated users can receive realtime messages'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Authenticated users can receive realtime messages"
      ON realtime.messages
      FOR SELECT
      TO authenticated
      USING (auth.uid() IS NOT NULL)
    $p$;
  END IF;
END $$;
