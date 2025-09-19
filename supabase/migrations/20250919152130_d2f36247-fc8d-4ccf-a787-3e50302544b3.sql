-- Fix critical security issues: Comprehensive policy reset for content and image tables
-- This migration safely resets all policies to prevent critical vulnerabilities

-- 1. Reset content_names table policies completely
DROP POLICY IF EXISTS "Anyone can delete content names" ON public.content_names;
DROP POLICY IF EXISTS "Anyone can update content names" ON public.content_names;
DROP POLICY IF EXISTS "Authenticated users can add content names" ON public.content_names;
DROP POLICY IF EXISTS "Everyone can view content names" ON public.content_names;
DROP POLICY IF EXISTS "Only admins can update content names" ON public.content_names;
DROP POLICY IF EXISTS "Only admins can delete content names" ON public.content_names;

-- Create secure content_names policies
CREATE POLICY "content_names_select_policy"
ON public.content_names
FOR SELECT
USING (true);

CREATE POLICY "content_names_insert_policy"
ON public.content_names
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "content_names_update_admin_policy"
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

CREATE POLICY "content_names_delete_admin_policy"
ON public.content_names
FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE is_admin = true
  )
);

-- 2. Reset tags table policies completely
DROP POLICY IF EXISTS "Anyone can create tags" ON public.tags;
DROP POLICY IF EXISTS "Anyone can delete tags" ON public.tags;
DROP POLICY IF EXISTS "Anyone can view tags" ON public.tags;
DROP POLICY IF EXISTS "Only admins can create tags" ON public.tags;
DROP POLICY IF EXISTS "Only admins can delete tags" ON public.tags;

-- Create secure tags policies
CREATE POLICY "tags_select_policy"
ON public.tags
FOR SELECT
USING (true);

CREATE POLICY "tags_insert_admin_policy"
ON public.tags
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE is_admin = true
  )
);

CREATE POLICY "tags_delete_admin_policy"
ON public.tags
FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE is_admin = true
  )
);

-- 3. Reset images table policies completely
DROP POLICY IF EXISTS "Allow all operations during development" ON public.images;
DROP POLICY IF EXISTS "Authenticated users can view images" ON public.images;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON public.images;
DROP POLICY IF EXISTS "Only admins can delete images" ON public.images;
DROP POLICY IF EXISTS "Users can update their image selections" ON public.images;

-- Create secure images policies
CREATE POLICY "images_select_policy"
ON public.images
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "images_insert_policy"
ON public.images
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "images_update_policy"
ON public.images
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "images_delete_admin_policy"
ON public.images
FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE is_admin = true
  )
);

-- 4. Reset scraped_images table policies completely
DROP POLICY IF EXISTS "Enable read access for all users" ON public.scraped_images;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.scraped_images;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.scraped_images;
DROP POLICY IF EXISTS "Everyone can view scraped images" ON public.scraped_images;
DROP POLICY IF EXISTS "Only admins can add scraped images" ON public.scraped_images;
DROP POLICY IF EXISTS "Only admins can delete scraped images" ON public.scraped_images;

-- Create secure scraped_images policies
CREATE POLICY "scraped_images_select_policy"
ON public.scraped_images
FOR SELECT
USING (true);

CREATE POLICY "scraped_images_insert_admin_policy"
ON public.scraped_images
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE is_admin = true
  )
);

CREATE POLICY "scraped_images_delete_admin_policy"
ON public.scraped_images
FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE is_admin = true
  )
);