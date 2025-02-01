export interface Tag {
  id: string;
  name: string;
  created_at?: string;
  is_category?: boolean;
}

export interface ItemTag {
  tag_id: string;
  tags: Tag;
}