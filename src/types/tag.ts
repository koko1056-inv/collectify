export type TableName = "user_item_likes" | "item_memories" | "user_item_tags" | "user_items";

export interface Tag {
  id: string;
  name: string;
  created_at: string;
  is_category?: boolean;
}

export interface TagRelation {
  id: string;
  tags: Tag | null;
}

export interface TagOperationResult {
  error: any;
  operation: TableName;
}

export interface ItemTagInsert {
  official_item_id: string;
  tag_id: string;
}

export interface UserItemTagInsert {
  user_item_id: string;
  tag_id: string;
}