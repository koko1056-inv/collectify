-- コメントに返信機能を追加
ALTER TABLE post_comments
ADD COLUMN parent_comment_id uuid REFERENCES post_comments(id) ON DELETE CASCADE;

-- 親コメントIDにインデックスを追加（パフォーマンス向上のため）
CREATE INDEX idx_post_comments_parent ON post_comments(parent_comment_id);