-- tagsテーブルにcontent_idカラムを追加
ALTER TABLE tags 
ADD COLUMN content_id uuid REFERENCES content_names(id) ON DELETE CASCADE;

-- content_idにインデックスを作成（パフォーマンス向上）
CREATE INDEX idx_tags_content_id ON tags(content_id);

-- categoryとcontent_idの組み合わせにインデックスを作成
CREATE INDEX idx_tags_category_content ON tags(category, content_id);

-- コメント追加
COMMENT ON COLUMN tags.content_id IS 'キャラクターとシリーズタグの場合、所属するコンテンツのID。タイプタグの場合はNULL。';