/**
 * タグ関連のすべてのユーティリティ関数をエクスポート
 */

// コア関数
export { isValidUUID, isUUID } from './tag-core';

// タグ操作（追加・削除・更新）
export { addTagToItem, removeTagFromItem, updateTagsForMultipleItems } from './tag-mutations';

// タグクエリ
export { getTagsForItem, getTagsForMultipleItems, isItemInUserCollection } from './tag-basic-queries';

// タグ検索
export { getTagsByCategory, findTagIdByName, isSimpleTag, getTagGroups } from './tag-search';

// タググループ
export { getItemsGroupedByTag, getItemsGroupedByCustomGroups } from './tag-groups';

// タグコピー
export { copyTagsFromOfficialItem } from './tag-copy';

// コンテンツ操作
export { getAllContentNames, addContentName, getContentById, setItemContent } from './content-operations';

// ユーザーアイテム操作
export { deleteUserItem, getRandomUserItem } from './user-item-operations';

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
