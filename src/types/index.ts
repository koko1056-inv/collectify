export interface OfficialItem {
  id: string;
  title: string;
  description: string | null;
  image: string;
  price: string;
  release_date: string;
  created_at: string;
  created_by: string | null;
  artist: string | null;
  anime: string | null;
  item_tags?: Array<{
    tags: {
      id: string;
      name: string;
    } | null;
  }>;
}

export interface UserItem {
  id: string;
  title: string;
  release_date: string;
  image: string;
  prize: string;
  official_link: string | null;
  created_at: string;
  user_id: string;
  artist: string | null;
  anime: string | null;
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export interface ItemMemory {
  id: string;
  user_item_id: string;
  comment: string | null;
  image_url: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  is_read: boolean;
  trade_request_id?: string;
}
