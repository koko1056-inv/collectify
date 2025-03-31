
// ContentInfoの型定義
export interface ContentInfo {
  id: string;
  name: string;
  type: string;
  created_at: string;
  created_by: string;
  icon_name?: string; // オプショナルプロパティとして追加
}

// SimpleItemTagの型定義（無限再帰を防ぐため、明示的に構造を定義）
export interface SimpleItemTag {
  tag_id: string;
  tags: {
    id: string;
    name: string;
    category: string;
    created_at: string;
  };
}

// SimpleTag型の定義
export interface SimpleTag {
  id: string;
  name: string;
  category?: string;
  created_at: string;
}

// TagGroupedItems型の定義
export interface TagGroupedItems {
  [tagName: string]: any[];
}
