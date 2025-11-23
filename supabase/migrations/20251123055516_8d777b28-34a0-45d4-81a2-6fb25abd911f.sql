-- コメントいいねテーブルを作成
CREATE TABLE public.comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLSを有効化
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- ポリシー: 誰でもいいねを閲覧可能
CREATE POLICY "Anyone can view comment likes"
ON public.comment_likes
FOR SELECT
USING (true);

-- ポリシー: ユーザーは自分のいいねを管理可能
CREATE POLICY "Users can manage their own comment likes"
ON public.comment_likes
FOR ALL
USING (auth.uid() = user_id);

-- インデックスを作成してパフォーマンス向上
CREATE INDEX idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON public.comment_likes(user_id);

-- 同じユーザーが同じコメントに複数回いいねできないようにユニーク制約
CREATE UNIQUE INDEX unique_comment_like ON public.comment_likes(comment_id, user_id);