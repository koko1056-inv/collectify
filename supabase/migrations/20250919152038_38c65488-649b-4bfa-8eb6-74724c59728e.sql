-- Fix critical security issues: Restrict content modification and image access
-- This migration addresses two critical security vulnerabilities while preserving existing functionality

-- 1. Fix content_names table - Only allow admins to modify, users can view and add
DROP POLICY IF EXISTS "Anyone can delete content names" ON public.content_names;
DROP POLICY IF EXISTS "Anyone can update content names" ON public.content_names;
DROP POLICY IF EXISTS "Authenticated users can add content names" ON public.content_names;
DROP POLICY IF EXISTS "Everyone can view content names" ON public.content_names;

-- Create secure policies for content_names
CREATE POLICY "Everyone can view content names"
ON public.content_names
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can add content names"
ON public.content_names
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Only allow admins to update/delete content names to prevent corruption
CREATE POLICY "Only admins can update content names"
ON public.content_names
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE is_admin = true
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE is_admin = true
  )
);

CREATE POLICY "Only admins can delete content names"
ON public.content_names
FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE is_admin = true
  )
);

-- 2. Fix tags table - Only allow admins to modify, users can view
DROP POLICY IF EXISTS "Anyone can create tags" ON public.tags;
DROP POLICY IF EXISTS "Anyone can delete tags" ON public.tags;
DROP POLICY IF EXISTS "Anyone can view tags" ON public.tags;

-- Create secure policies for tags
CREATE POLICY "Everyone can view tags"
ON public.tags
FOR SELECT
USING (true);

-- Only allow admins to create/delete tags to prevent corruption
CREATE POLICY "Only admins can create tags"
ON public.tags
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE is_admin = true
  )
);

CREATE POLICY "Only admins can delete tags"
ON public.tags
FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE is_admin = true
  )
);

-- 3. Fix images table - Restrict to authenticated users only
DROP POLICY IF EXISTS "Allow all operations during development" ON public.images;

-- Create secure policies for images
CREATE POLICY "Authenticated users can view images"
ON public.images
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload images"
ON public.images
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Only allow admins to delete images to prevent abuse
CREATE POLICY "Only admins can delete images"
ON public.images
FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE is_admin = true
  )
);

CREATE POLICY "Users can update their image selections"
ON public.images
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Fix scraped_images table - Restrict to admin operations only
DROP POLICY IF EXISTS "Enable read access for all users" ON public.scraped_images;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.scraped_images;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.scraped_images;

-- Create secure policies for scraped_images
CREATE POLICY "Everyone can view scraped images"
ON public.scraped_images
FOR SELECT
USING (true);

-- Only allow admins to manage scraped images
CREATE POLICY "Only admins can add scraped images"
ON public.scraped_images
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE is_admin = true
  )
);

CREATE POLICY "Only admins can delete scraped images"
ON public.scraped_images
FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE is_admin = true
  )
);