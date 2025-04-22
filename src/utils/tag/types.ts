
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
 * 簡易版のタグ型（後方互換性のため）
 */
export interface SimpleTag {
  id: string;
  name: string;
  category?: string;
  created_at?: string;
  count?: number;
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
 * ユーザーアイテムとそのタグ
 */
export interface UserItemWithTags {
  id: string;
  title: string;
  image: string;
  user_item_tags: {
    tags: Tag;
  }[];
}

/**
 * タググループ
 */
export interface TagGroup {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

/**
 * コンテンツ情報
 */
export interface ContentInfo {
  id: string;
  name: string;
  type: string;
  created_at?: string;
  created_by?: string;
  icon_name?: string;
}

/**
 * タグでグループ化されたアイテム
 */
export interface TagGroupedItems {
  [tagName: string]: any[];
}

/**
 * タグでグループ化されたアイテム
 */
export interface ItemsGroupedByTag {
  group_name: string;
  items: any[]; // アイテムの詳細はサーバーからの応答によって異なる場合がある
}
