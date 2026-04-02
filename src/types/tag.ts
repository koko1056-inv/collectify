/**
 * タグ関連の型定義（統合版）
 * すべてのタグ関連の型はここから参照してください
 */

// ============= 基本型 =============

/**
 * 基本的なタグ型
 */
export interface Tag {
  id: string;
  name: string;
  category?: string | null;
  created_at?: string;
  is_category?: boolean | null;
  count?: number;
  content_id?: string | null;
  status?: string;
  usage_count?: number;
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

// ============= アイテムタグ関連 =============

/**
 * 基本的なタグ関連情報
 */
export interface BaseItemTag {
  id: string;
  tag_id: string;
}

/**
 * タグ情報を含むアイテムタグ
 */
export interface ItemTagWithTag extends BaseItemTag {
  tags: Tag | null;
}

/**
 * ItemTagの型エイリアス（後方互換性のため）
 */
export type ItemTag = ItemTagWithTag;

/**
 * 簡易版のアイテムタグ型
 */
export interface SimpleItemTag {
  id: string;
  tag_id: string;
  tags: Tag | null;
}

// ============= タグカテゴリー =============

/**
 * タグカテゴリー型
 */
export type TagCategory = "character" | "type" | "series" | string;

// ============= タグ更新 =============

/**
 * タグ更新のインターフェース
 */
export interface TagUpdate {
  category: string;
  value: string | null;
}

// ============= グループ関連 =============

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
 * タグでグループ化されたアイテム
 */
export interface TagGroupedItems {
  [tagName: string]: any[];
}

/**
 * タグでグループ化されたアイテム（明示的な型定義）
 */
export interface ItemsGroupedByTag {
  group_name: string;
  items: Array<{
    id: string;
    title: string;
    image: string;
    content_name?: string | null;
    quantity?: number;
    [key: string]: any;
  }>;
}

// ============= コンテンツ関連 =============

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
  image_url?: string | null;
}

// ============= ユーザーアイテム関連 =============

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
