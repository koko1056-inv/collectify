-- Fix critical security issues: Restrict content modification and image access (Fixed)
-- This migration addresses two critical security vulnerabilities while preserving existing functionality

-- 1. Fix content_names table - Only allow admins to modify, users can view and add
DROP POLICY IF EXISTS "Anyone can delete content names" ON public.content_names;
DROP POLICY IF EXISTS "Anyone can update content names" ON public.content_names;
DROP POLICY IF EXISTS "Authenticated users can add content names" ON public.content_names;
DROP POLICY IF EXISTS "Everyone can view content names" ON public.content_names;

-- Create secure policies for content_names
CREATE POLICY "Secure content names view"
ON public.content_names
FOR SELECT
USING (true);

CREATE POLICY "Secure content names insert"
ON public.content_names
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Only allow admins to update/delete content names to prevent corruption
CREATE POLICY "Admin only content names update"
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

CREATE POLICY "Admin only content names delete"
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
DROP POLICY IF EXISTS "Everyone can view tags" ON public.tags;

-- Create secure policies for tags
CREATE POLICY "Secure tags view"
ON public.tags
FOR SELECT
USING (true);

-- Only allow admins to create/delete tags to prevent corruption
CREATE POLICY "Admin only tags create"
ON public.tags
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE is_admin = true
  )
);

CREATE POLICY "Admin only tags delete"
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
CREATE POLICY "Secure images view"
ON public.images
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Secure images upload"
ON public.images
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Only allow admins to delete images to prevent abuse
CREATE POLICY "Admin only images delete"
ON public.images
FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE is_admin = true
  )
);

CREATE POLICY "Secure images update"
ON public.images
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Fix scraped_images table - Restrict to admin operations only
DROP POLICY IF EXISTS "Enable read access for all users" ON public.scraped_images;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.scraped_images;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.scraped_images;

-- Create secure policies for scraped_images
CREATE POLICY "Secure scraped images view"
ON public.scraped_images
FOR SELECT
USING (true);

-- Only allow admins to manage scraped images
CREATE POLICY "Admin only scraped images insert"
ON public.scraped_images
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE is_admin = true
  )
);

CREATE POLICY "Admin only scraped images delete"
ON public.scraped_images
FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE is_admin = true
  )
);