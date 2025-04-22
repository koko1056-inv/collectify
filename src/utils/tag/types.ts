
import { Tag as TagBase } from "@/types/tag";

/**
 * ベーシックなタグ型
 */
export interface Tag extends TagBase {
  id: string;
  name: string;
  category?: string;
  created_at?: string;
}

/**
 * 簡易版のアイテムタグ型
 */
export interface SimpleItemTag {
  id: string;
  tag_id: string;
  tags: Tag | null;
}

/**
 * タグでグループ化されたアイテム
 */
export interface ItemsGroupedByTag {
  group_name: string;
  items: any[]; // アイテムの詳細はサーバーからの応答によって異なる場合がある
}
