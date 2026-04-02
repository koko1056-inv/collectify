
-- messages
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread 
  ON public.messages (receiver_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_messages_trade_request_id 
  ON public.messages (trade_request_id) WHERE trade_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver 
  ON public.messages (sender_id, receiver_id);

-- goods_posts
CREATE INDEX IF NOT EXISTS idx_goods_posts_user_item_id 
  ON public.goods_posts (user_item_id);
CREATE INDEX IF NOT EXISTS idx_goods_posts_created_at 
  ON public.goods_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goods_posts_user_id 
  ON public.goods_posts (user_id);

-- post_likes
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id 
  ON public.post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_post 
  ON public.post_likes (user_id, post_id);

-- post_comments
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id 
  ON public.post_comments (post_id);

-- follows
CREATE INDEX IF NOT EXISTS idx_follows_following_id 
  ON public.follows (following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id 
  ON public.follows (follower_id);

-- user_items
CREATE INDEX IF NOT EXISTS idx_user_items_official_item_id 
  ON public.user_items (official_item_id) WHERE official_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_items_user_created 
  ON public.user_items (user_id, created_at DESC);

-- item_tags
CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id 
  ON public.item_tags (tag_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON public.notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON public.notifications (user_id, created_at DESC);

-- collection_likes
CREATE INDEX IF NOT EXISTS idx_collection_likes_owner 
  ON public.collection_likes (collection_owner_id);
CREATE INDEX IF NOT EXISTS idx_collection_likes_user 
  ON public.collection_likes (user_id);

-- comment_likes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id 
  ON public.comment_likes (comment_id);

-- wishlists
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id 
  ON public.wishlists (user_id);

-- poll_votes
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id 
  ON public.poll_votes (poll_id);

-- point_transactions
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id 
  ON public.point_transactions (user_id);

-- official_items
CREATE INDEX IF NOT EXISTS idx_official_items_content_name 
  ON public.official_items (content_name) WHERE content_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_official_items_created_at 
  ON public.official_items (created_at DESC);

-- tags: 名前検索用btreeインデックス
CREATE INDEX IF NOT EXISTS idx_tags_name 
  ON public.tags (name);
