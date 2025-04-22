
// タグに関するシンプルな型定義
export interface SimpleItemTag {
  id: string;
  tag_id: string;
  tags?: {
    id: string;
    name: string;
    category?: string;
    created_at?: string;
  } | null;
}

// タグの基本的な型定義
export interface SimpleTag {
  id: string;
  name: string;
  category?: string;
  created_at?: string;
}

// タグ更新の型定義
export interface TagUpdate {
  category: string;
  value: string | null;
}
