
export interface Tag {
  id: string;
  name: string;
  category?: string;
  created_at: string;
}

export interface BaseItemTag {
  id: string;
  tag_id: string;
}

export interface ItemTagWithTag extends BaseItemTag {
  tags: Tag | null;
}

export type ItemTag = ItemTagWithTag;

export type TagCategory = "character" | "type" | "series";

export interface TagUpdate {
  category: string;
  value: string | null;
}
