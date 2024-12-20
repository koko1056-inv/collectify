export interface OfficialItem {
  id: string;
  title: string;
  description: string | null;
  image: string;
  price: string;
  release_date: string;
  created_at: string;
  created_by: string | null;
  item_tags?: {
    tag_id: string;
    tags: {
      name: string;
    };
  }[];
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
  is_shared: boolean;
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