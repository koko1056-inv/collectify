-- 問題のあるタグを削除する（nameフィールドにUUIDが入っているもの）

-- characterカテゴリーの問題のあるタグを削除
DELETE FROM tags 
WHERE category = 'character' 
  AND name = 'b6a9ac47-e551-45bd-ba41-7a6bc5d7db06';

-- typeカテゴリーの問題のあるタグを削除
DELETE FROM tags 
WHERE category = 'type' 
  AND name = 'c9901dc0-28ad-4b11-8d54-d3b5457235a3';

DELETE FROM tags 
WHERE category = 'type' 
  AND name = 'ffecadd4-6183-46a1-b64a-387356c672f7';

-- seriesカテゴリーの問題のあるタグを削除
DELETE FROM tags 
WHERE category = 'series' 
  AND name = '988f0b7a-219d-4ec1-b2dd-3dffbe3cc59e';

-- 重複したタグのクリーンアップ
-- 同じIDが複数存在する場合、最新のものを残す
DELETE FROM tags a 
WHERE a.id IN (
  SELECT t1.id 
  FROM tags t1 
  JOIN tags t2 ON t1.id = t2.id 
  WHERE t1.created_at < t2.created_at
);

-- 今後UUIDがnameとして保存されることを防ぐためのチェック制約を追加
ALTER TABLE tags ADD CONSTRAINT tags_name_not_uuid_check 
  CHECK (name !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');