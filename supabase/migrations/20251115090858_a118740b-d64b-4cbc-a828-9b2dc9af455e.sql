-- すべての既存のユニーク制約とインデックスを確認して削除
DO $$ 
BEGIN
    -- 古い制約を削除（存在する場合）
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tags_name_category_unique') THEN
        ALTER TABLE tags DROP CONSTRAINT tags_name_category_unique;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_name_category') THEN
        ALTER TABLE tags DROP CONSTRAINT unique_name_category;
    END IF;
END $$;

-- 古いインデックスを削除（存在する場合）
DROP INDEX IF EXISTS tags_name_category_unique;
DROP INDEX IF EXISTS unique_name_category;
DROP INDEX IF EXISTS tags_name_category_content_unique;
DROP INDEX IF EXISTS tags_name_category_null_content_unique;

-- 新しいユニーク制約を作成
-- content_idがある場合: name + category + content_id の組み合わせがユニーク
CREATE UNIQUE INDEX tags_name_category_content_unique 
ON tags (name, category, content_id) 
WHERE content_id IS NOT NULL;

-- content_idがNULLの場合（typeカテゴリなど）: name + category の組み合わせがユニーク
CREATE UNIQUE INDEX tags_name_category_null_content_unique 
ON tags (name, category) 
WHERE content_id IS NULL;