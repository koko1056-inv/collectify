
// タグ関連の共通の型定義

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

// ネストされた構造を持つタグ型
export interface GroupedTags {
  [category: string]: SimpleTag[];
}

// ユーザーアイテムのタグクエリ結果型
export interface TagQueryItem {
  id: string;
  title: string;
  image: string;
  quantity?: number;
  user_id: string;
  official_item_id?: string;
  created_at?: string;
  updated_at?: string;
  user_item_tags?: Array<{
    tag_id: string;
    tags: SimpleTag | null;
  }>;
}

// 既存の UserItem インターフェースを維持
export interface UserItem {
  id: string;
  title: string;
  image: string;
  user_id: string;
  official_item_id?: string;
  created_at?: string;
  updated_at?: string;
  quantity?: number;
}

// タグ付けされたアイテムグループの型
export type TaggedItemGroups = Record<string, UserItem[]>;
