
export interface Tag {
  id: string;
  name: string;
  category: string | null;
  created_at: string;
}

export interface ItemTag {
  id: string;
  tag_id: string;
  tag: Tag;  // 'tags' ではなく 'tag' に変更
}

export type TagCategory = "character" | "type" | "series";
