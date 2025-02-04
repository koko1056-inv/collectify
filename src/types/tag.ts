export interface Tag {
  id: string;
  name: string;
  created_at: string;
  is_category?: boolean;
}

export interface TagRelation {
  tag_id: string;
  tags: {
    name: string;
  } | null;
}

export type TableName = "item_tags" | "user_item_tags" | "user_item_likes" | "item_memories";