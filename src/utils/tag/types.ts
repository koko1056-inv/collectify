
export interface SimpleItemTag {
  tag_id: string;
  tags: {
    id: string;
    name: string;
    category: string;
    created_at: string;
  } | null;
}

export interface TagGroupedItems {
  [tagName: string]: any[];
}

export interface GroupInfo {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  color?: string;
}
