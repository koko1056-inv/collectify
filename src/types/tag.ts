
export interface Tag {
  id: string;
  name: string;
  category?: string;
  count?: number;  // Make count optional since we use it in some places
  created_at?: string;
}

// 基本的なタグ関連情報
export interface BaseItemTag {
  id: string;
  tag_id: string;
}

// タグ情報を含むタグ関連
export interface ItemTagWithTag extends BaseItemTag {
  tags: Tag;
}

// 修正済みのItemTag型（item_idを持たない）
export interface ItemTag {
  id: string;
  tag_id: string;
  created_at?: string;
}

// タグカテゴリー型
export type TagCategory = "character" | "type" | "series";

// タグ更新のインターフェース
export interface TagUpdate {
  category: string;
  value: string | null;
}
