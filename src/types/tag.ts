export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export interface TagRelation {
  id: string;
  tags: Tag | null;
}

export type TableName = 
  | "user_item_likes" 
  | "item_memories" 
  | "user_item_tags" 
  | "user_items";