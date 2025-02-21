
export interface Tag {
  id: string;
  name: string;
  category: string | null;
  created_at: string;
}

export interface ItemTag {
  id: string;
  tag_id: string;
  tags: Tag;
}

export type TagCategory = "character" | "type" | "series";
