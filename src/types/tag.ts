
export interface Tag {
  id: string;
  name: string;
  category?: string;
  created_at: string;
}

export interface ItemTag {
  id: string;
  tag_id: string;
  tags?: {
    id: string;
    name: string;
    category?: string;
    created_at: string;
  };
}

export type TableName = "user_item_likes" | "item_memories" | "user_item_tags";

export type TagCategory = "character" | "type" | "series";
