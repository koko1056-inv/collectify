export interface Tag {
  id: string;
  name: string;
  created_at?: string;
  is_category: boolean;
}

export interface TagRelation {
  id: string;
  tags: Tag;
}

export type TableName = 
  | "item_tags" 
  | "user_item_tags" 
  | "user_item_likes" 
  | "item_memories" 
  | "user_items";

export interface TagOperationResult {
  error: any;
}