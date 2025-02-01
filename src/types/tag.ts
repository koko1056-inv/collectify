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

export type TableName = "item_tags" | "user_item_tags";

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