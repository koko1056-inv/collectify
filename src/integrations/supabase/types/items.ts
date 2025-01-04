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
}

export interface ItemTag {
  id: string;
  official_item_id: string;
  tag_id: string;
  created_at: string;
}

export interface ItemMemory {
  id: string;
  user_item_id: string;
  comment: string | null;
  image_url: string | null;
  created_at: string;
}