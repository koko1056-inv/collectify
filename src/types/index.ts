
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
  content_name?: string | null;
  quantity?: number;
  item_type?: string;
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

// Import Tag from the tag module to maintain consistency
import { Tag as TagType } from "@/types/tag";
export type Tag = TagType;

export interface ItemMemory {
  id: string;
  user_item_id: string;
  comment: string | null;
  image_url: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  cover_image_url: string | null;
  bio: string | null;
  created_at: string;
  display_name: string | null;
  favorite_contents: string[] | null;
  favorite_item_ids: string[] | null;
  favorite_tags: string[] | null;
  followers_count: number | null;
  following_count: number | null;
  is_admin: boolean | null;
  interests: string[] | null;
  x_username: string | null;
}
