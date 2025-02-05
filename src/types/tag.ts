export interface Tag {
  id: string;
  name: string;
  created_at?: string;
  is_category?: boolean;
}

export interface ItemTag {
  id: string;
  tag_id: string;
  tags: Tag | null;
}

export type TableName = "user_item_likes" | "item_memories" | "user_item_tags";