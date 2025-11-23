-- Add name column to avatar_gallery table for custom avatar names
ALTER TABLE avatar_gallery 
ADD COLUMN name text;

-- Add an index for faster name searches
CREATE INDEX idx_avatar_gallery_name ON avatar_gallery(name);

-- Update existing avatars with default names based on creation date
UPDATE avatar_gallery 
SET name = 'アバター ' || to_char(created_at, 'YYYY/MM/DD HH24:MI')
WHERE name IS NULL;