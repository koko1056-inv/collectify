
// ContentInfoの型定義（icon_nameプロパティをオプションとして追加）
export interface ContentInfo {
  id: string;
  name: string;
  type: string;
  created_at: string;
  created_by: string;
  icon_name?: string;
}

// SimpleItemTag型の修正（無限再帰を防ぐ）
export interface SimpleItemTag {
  tag_id: string;
  tags: {
    id: string;
    name: string;
    category: string;
    created_at: string;
  } | null;
}

// SimpleTag型の定義を追加
export interface SimpleTag {
  id: string;
  name: string;
  category?: string;
  created_at: string;
}

// TagGroupedItems型の定義を追加
export interface TagGroupedItems {
  [tagName: string]: any[];
}
