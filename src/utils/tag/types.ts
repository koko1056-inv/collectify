
// 既存の型定義をそのまま保持

// グループ情報のインターフェース
export interface GroupInfo {
  id: string;
  name: string;
  description?: string;
  created_by?: string;
  created_at?: string;
  image_url?: string;
  color?: string;
  itemCount?: number;
}

// コンテンツ情報のインターフェース
export interface ContentInfo {
  id: string;
  name: string;
  type?: string;
  created_by?: string;
  created_at?: string;
  icon_name?: string;
}

// タグでグループ化されたアイテムの型
export interface TagGroupedItems {
  [key: string]: any[];
}

// シンプルなアイテムタグ型（循環参照を避けるため単純化）
export interface SimpleItemTag {
  tag_id: string;
  tags: {
    id: string;
    name: string;
    category?: string;
    created_at?: string;
  };
}

// グループメンバー情報の型
export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  created_at?: string;
}

// APIレスポンスのステータス型
export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
}
