
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
  itemCount?: number;
  image_url?: string;
}

// コンテンツ情報の型を追加
export interface ContentInfo {
  id: string;
  name: string;
  type: string;
  icon_name?: string;
  created_by: string;
  created_at: string;
}
