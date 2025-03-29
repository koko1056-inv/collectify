
// タグの基本的な情報を表す単純なインターフェース
export interface SimpleTag {
  id: string;
  name: string;
  category?: string;
  created_at?: string;
}

// アイテムタグの関連情報を表す単純なインターフェース
export interface SimpleItemTag {
  tag_id: string;
  tags: {
    id: string;
    name: string;
    category?: string;
    created_at?: string;
  };
}

// アイテムタグの更新情報
export interface TagUpdate {
  category: string;
  value: string | null;
}
