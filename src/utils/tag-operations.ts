/**
 * 後方互換性のためのファイル
 * すべての関数は新しいモジュール構造から再エクスポート
 */

// タグ関連のすべてのユーティリティ関数をエクスポート
export * from './tag/index';

// 型を再エクスポート
export type { 
  Tag, 
  SimpleTag, 
  SimpleItemTag, 
  ItemTag,
  TagUpdate,
  TagGroup,
  ContentInfo,
  TagGroupedItems,
  ItemsGroupedByTag,
  UserItemWithTags 
} from '@/types/tag';
