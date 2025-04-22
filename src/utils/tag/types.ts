
// 基本的なタグ型
export interface SimpleTag {
  id: string;
  name: string;
  category?: string;
  created_at?: string;
}

// シンプルなアイテムタグ型
export interface SimpleItemTag {
  id?: string;
  tag_id: string;
  tags: {
    id: string;
    name: string;
    category?: string;
    created_at?: string;
  };
}

// タグでグループ化されたアイテム
export interface TagGroupedItems {
  [tagName: string]: any[];
}

// タググループ型
export interface TagGroup {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

// コンテンツ情報型を追加
export interface ContentInfo {
  id: string;
  name: string;
  type: string;
  created_at?: string;
  created_by?: string;
  icon_name?: string;
}
