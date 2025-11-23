-- Drop existing restrictive SELECT policy for display_gallery
DROP POLICY IF EXISTS "Users can view their own display gallery" ON display_gallery;

-- Create new policy allowing everyone to view all galleries
CREATE POLICY "Anyone can view display galleries"
ON display_gallery
FOR SELECT
TO authenticated
USING (true);

-- Add a title field to display_gallery for better organization
ALTER TABLE display_gallery
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;