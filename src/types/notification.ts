export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message?: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'new_item';
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
}