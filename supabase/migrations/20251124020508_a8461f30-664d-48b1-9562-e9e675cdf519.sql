-- Add title and price columns to scraped_images table
ALTER TABLE scraped_images 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS price TEXT;