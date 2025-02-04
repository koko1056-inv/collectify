export interface Tag {
  id: string;
  name: string;
  created_at: string;
  is_category?: boolean;
}

export interface ItemTag {
  id: string;
  tag_id: string;
  created_at: string;
  tags: Tag;
}

export type TableName = "user_item_likes" | "item_memories" | "user_item_tags";