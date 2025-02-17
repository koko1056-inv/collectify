
export interface Tag {
  id: string;
  name: string;
  category?: string;
}

export interface ItemTag {
  id: string;
  tag_id: string;
  tags?: Tag;
}

export type TableName = "user_item_likes" | "item_memories" | "user_item_tags";

export type TagCategory = "all" | "type" | "character" | "series" | "other";
