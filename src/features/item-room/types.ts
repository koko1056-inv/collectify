export interface ItemRoomMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface ItemRoom {
  id: string;
  official_item_id: string;
  member_count: number;
  message_count: number;
  last_active_at: string;
  created_at: string;
}
