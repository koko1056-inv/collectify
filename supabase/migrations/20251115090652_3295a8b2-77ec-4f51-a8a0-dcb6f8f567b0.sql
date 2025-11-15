-- 既存のユニーク制約を削除
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_name_category_unique;

-- 新しいユニーク制約を追加
-- name + category + content_id の組み合わせがユニークである必要がある
-- ただし、content_idがNULLの場合も考慮する必要があるため、部分インデックスを使用
CREATE UNIQUE INDEX tags_name_category_content_unique 
ON tags (name, category, content_id) 
WHERE content_id IS NOT NULL;

-- content_idがNULLの場合（typeカテゴリなど）のユニーク制約
CREATE UNIQUE INDEX tags_name_category_null_content_unique 
ON tags (name, category) 
WHERE content_id IS NULL;