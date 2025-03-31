
import { Tag } from "@/types/tag";

// データグループの型
export interface TagGroupedItems {
  [tagName: string]: any[];
}

// シンプルなItemTag型 (循環参照を避ける)
export interface SimpleItemTag {
  tag_id: string;
  tags: {
    id: string;
    name: string;
    category?: string;
    created_at?: string;
  } | null;
}

// コンテンツ情報の型
export interface ContentInfo {
  id: string;
  name: string;
  type: string;
  icon_name?: string;  // icon_nameプロパティを明示的に追加
  created_by: string;
  created_at: string;
}

// グループ情報の型
export interface GroupInfo {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  image_url?: string;
  itemCount?: number;
}
