
-- 1) Drop unused public.images table (was empty and had overly permissive policies)
DROP TABLE IF EXISTS public.images CASCADE;

-- 2) Tighten public storage buckets: remove broad SELECT policies that allow listing.
-- Direct file access via public CDN URLs (getPublicUrl) is unaffected.
DROP POLICY IF EXISTS "Allow public access to profile images" ON storage.objects;
DROP POLICY IF EXISTS "Give public read-only access" ON storage.objects;
DROP POLICY IF EXISTS "ai_rooms_bucket_public_read" ON storage.objects;
DROP POLICY IF EXISTS "item_posts_bucket_public_read" ON storage.objects;
