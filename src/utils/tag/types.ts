
// ContentInfoの型定義（icon_nameプロパティを明示的に追加）
export interface ContentInfo {
  id: string;
  name: string;
  type: string;
  created_at: string;
  created_by: string;
  icon_name?: string | null;
}

// SimpleItemTagの型定義（無限再帰を防ぐため、明示的に構造を定義）
export interface SimpleItemTag {
  tag_id: string;
  tags: {
    id: string;
    name: string;
    category?: string; // categoryをオプショナルに変更
    created_at: string;
  } | null;
}

// SimpleTag型の定義
export interface SimpleTag {
  id: string;
  name: string;
  category?: string;
  created_at: string;
  is_category?: boolean;
}

// TagGroupedItems型の定義
export interface TagGroupedItems {
  [tagName: string]: any[];
}

// TagGroup型の定義
export interface TagGroup {
  name: string;
  tags: string[];
}
