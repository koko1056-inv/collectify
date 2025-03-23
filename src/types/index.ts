export interface OfficialItem {
  id: string;
  title: string;
  image: string;
  description?: string;
  artist?: string;
  anime?: string;
  release_date?: string;
  created_at?: string;
  created_by?: string;
  content_name?: string | null;
  item_tags?: ItemTag[];
}

export interface ItemTag {
  tags?: {
    id: string;
    name: string;
    category?: string;
  } | null;
}

export interface Tag {
  id: string;
  name: string;
  count: number;
}

// TradeRequestの型定義
export interface TradeRequest {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  shipping_status?: 'not_shipped' | 'shipped' | 'completed';
  is_open?: boolean;
  message?: string;
  sender_id: string;
  receiver_id: string | null;
  offered_item_id: string;
  requested_item_id: string;
  created_at?: string;
}

// メッセージの型定義
export interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  trade_request_id?: string | null;
  is_read: boolean;
}

// テーマ関連の型を追加
export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  favorite_item_ids?: string[];
  interests?: string[];
  favorite_contents?: string[];
  favorite_tags?: string[];
  is_admin?: boolean;
  themes?: string[];
}

// UserItem型を拡張してthemeプロパティを追加
export interface UserItem {
  id: string;
  title: string;
  image: string;
  user_id: string;
  quantity: number;
  release_date?: string | null;
  prize?: string | null;
  purchase_date?: string | null;
  purchase_price?: string | null;
  official_item_id?: string | null;
  original_item_id?: string | null;
  official_link?: string | null;
  images?: string[];
  theme?: string | null;
  user_item_tags?: UserItemTag[];
}

export interface UserItemTag {
  tags?: {
    id: string;
    name: string;
  } | null;
}
