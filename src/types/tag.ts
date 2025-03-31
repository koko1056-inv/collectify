
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
  tags: {
    id: string;
    name: string;
    category?: string | null;
    created_at?: string;
  };
}

// ItemTagを純粋な型エイリアスとして定義（循環参照を避ける）
export type ItemTag = ItemTagWithTag;

// タグカテゴリー型
export type TagCategory = "character" | "type" | "series";

// タグ更新のインターフェース
export interface TagUpdate {
  category: string;
  value: string | null;
}

// コンテンツ情報インターフェース拡張（icon_nameプロパティを追加）
export interface ContentInfo {
  id: string;
  name: string;
  type: string;
  created_at: string;
  created_by: string;
  icon_name?: string;
}
