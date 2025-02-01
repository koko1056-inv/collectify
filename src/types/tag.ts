export interface Tag {
  id: string;
  name: string;
  created_at?: string;
  is_category?: boolean;
}

export interface ItemTag {
  tag_id: string;
  tags: Tag;
}

export type TableName = "user_item_tags" | "item_tags" | "user_item_likes" | "item_memories";