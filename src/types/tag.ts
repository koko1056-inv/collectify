export interface Tag {
  id: string;
  name: string;
  created_at: string;
  is_category?: boolean;
}

export interface TagWithItem {
  tag_id: string;
  tags: Tag | null;
}

export interface ItemTag {
  id: string;
  tag_id: string;
  user_item_id?: string;
  official_item_id?: string;
  created_at: string;
  tags: Tag | null;
}

export type TableName = "user_item_likes" | "item_memories" | "user_item_tags";