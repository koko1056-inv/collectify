export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message?: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'new_item' | 'comment' | 'reply' | 'like' | 'new_item_tag' | 'greeting_stamp' | 'match_success' | 'item_post_comment' | 'item_post_like' | 'trade_request' | 'trade_accepted' | 'trade_rejected' | 'trade_cancelled' | 'trade_unavailable' | 'trade_shipped' | 'trade_received' | 'trade_completed' | 'trade_nudge' | 'admin_report';
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationData {
  // Trade notifications
  trade_id?: string;
  partner_id?: string;
  url?: string;
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
  // Greeting stamps
  stamp_id?: string;
  sender_id?: string;
  stamp_type?: string;
  context_type?: string;
  context_id?: string;
  // Match
  matched_user_id?: string;
}