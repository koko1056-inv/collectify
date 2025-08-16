-- Fix security vulnerability: Restrict profile visibility to authenticated users only
-- Replace the overly permissive "Users can view all profiles" policy

-- First, drop the existing policy that allows anyone to view all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a new policy that only allows authenticated users to view profiles
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Also ensure the policy for users to read their own admin status is preserved
-- (This policy already exists and is more restrictive, so it will take precedence for admin status)