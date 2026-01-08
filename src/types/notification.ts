export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message?: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'new_item' | 'comment' | 'reply' | 'like' | 'new_item_tag';
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationData {
  item_id?: string;
  item_title?: string;
  content_name?: string;
  image?: string;
  // Comment/Reply/Like notifications
  post_id?: string;
  comment_id?: string;
  parent_comment_id?: string;
  commenter_id?: string;
  commenter_username?: string;
  liker_id?: string;
  liker_username?: string;
  comment_text?: string;
}