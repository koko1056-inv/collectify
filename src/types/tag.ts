export interface Tag {
  id: string;
  name: string;
  is_category?: boolean;
}

export interface TagRelation {
  id: string;
  tag_id: string;
  tags: Tag | null;
}

export type TableName = "item_tags" | "user_item_tags";