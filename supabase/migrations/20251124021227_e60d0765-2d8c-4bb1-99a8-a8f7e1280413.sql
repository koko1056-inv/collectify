-- Remove price column from scraped_images table
ALTER TABLE scraped_images 
DROP COLUMN IF EXISTS price;