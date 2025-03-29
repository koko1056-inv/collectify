
export interface Tag {
  id: string;
  name: string;
  category?: string | null;
  created_at?: string;
  is_category?: boolean | null;
  count?: number;
}

export interface ItemTag {
  id: string;
  tag_id: string;
  tags: Tag | null;
}
