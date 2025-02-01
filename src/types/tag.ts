export interface Tag {
  id: string;
  name: string;
  created_at?: string;
  is_category?: boolean;
}

export interface TagWithRelation {
  id: string;
  tag: Tag;
}

export type TableName = "user_item_tags" | "item_tags";