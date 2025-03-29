
// タグ関連の型定義
export interface SimpleTag {
  id: string;
  name: string;
  category?: string;
  created_at?: string;
}

export interface SimpleItemTag {
  tag_id: string;
  tags: SimpleTag | null;
}

// コンテンツ情報の型定義
export interface ContentInfo {
  id: string;
  name: string;
  type: string;
  created_at: string;
  created_by: string;
  icon_name: string;
}

// タググループ化されたアイテムの型定義
export interface TagGroupedItems {
  [tagName: string]: any[];
}
