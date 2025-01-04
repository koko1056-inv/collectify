export interface CollectionLike {
  id: string;
  user_id: string;
  collection_owner_id: string;
  created_at: string;
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
  quantity: number;
}

export interface UserItemLike {
  id: string;
  user_id: string;
  user_item_id: string;
  created_at: string;
}

export interface UserItemTag {
  id: string;
  user_item_id: string;
  tag_id: string;
  created_at: string;
}