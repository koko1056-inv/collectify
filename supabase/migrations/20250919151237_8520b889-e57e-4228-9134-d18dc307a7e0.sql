-- Fix security issue: Restrict profile data access more strictly

-- Drop existing potentially permissive profile policies
DROP POLICY IF EXISTS "Profiles view based on privacy and relationships" ON public.profiles;
DROP POLICY IF EXISTS "Users can read their own admin status" ON public.profiles;

-- Create more restrictive profile viewing policy
CREATE POLICY "Profiles view with strict privacy controls" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always see their own profile
  id = auth.uid()
  OR
  -- Only show basic profile info for public profiles (no sensitive data like admin status)
  (
    privacy_level = 'public'::profile_privacy
    AND auth.uid() IS NOT NULL  -- Require authentication
  )
  OR
  -- Show profiles to followers only if privacy is set to followers
  (
    privacy_level = 'followers'::profile_privacy
    AND auth.uid() IS NOT NULL  -- Require authentication
    AND public.is_follower(id)
  )
);

-- Ensure all existing profiles have a privacy level set (default to public for backward compatibility)
UPDATE public.profiles 
SET privacy_level = 'public'::profile_privacy 
WHERE privacy_level IS NULL;

-- Make privacy_level required for new profiles
ALTER TABLE public.profiles 
ALTER COLUMN privacy_level SET NOT NULL;