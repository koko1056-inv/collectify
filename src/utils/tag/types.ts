
// 既存の型定義をそのまま保持

// グループ情報のインターフェース
export interface GroupInfo {
  id: string;
  name: string;
  description?: string;
  created_by?: string;
  created_at?: string;
  image_url?: string;
  color?: string; // colorプロパティを追加
  itemCount?: number; // 表示用のアイテム数
}

// コンテンツ情報のインターフェース
export interface ContentInfo {
  id: string;
  name: string;
  type?: string;
  created_by?: string;
  created_at?: string;
  icon_name?: string; // icon_nameプロパティを追加
}

// タグでグループ化されたアイテムの型
export interface TagGroupedItems {
  [key: string]: any[];
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
  } | null;
}
