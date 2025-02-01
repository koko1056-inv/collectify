export interface Tag {
  id: string;
  name: string;
  created_at?: string;
  is_category?: boolean;
}

export interface TagRelation {
  id: string;
  tags: {
    id: string;
    name: string;
    is_category?: boolean;
  } | null;
}

export type TableName = 
  | "user_item_likes" 
  | "item_memories" 
  | "user_item_tags" 
  | "item_tags";