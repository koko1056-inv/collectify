
// This file is kept for backward compatibility.
// It re-exports all functions from the new modular structure.
export * from './tag/index';

// タグ追加と削除関数を直接エクスポート
export { addTagToItem, removeTagFromItem } from './tag/tag-mutations';
export { 
  getTagsForItem, 
  isItemInUserCollection,
} from './tag/tag-queries';
export {
  getTagsByCategory,
  searchTagsByCategory,
  getPopularTags
} from './tag/tag-search';
export {
  getItemsGroupedByTag,
  addItemsToGroup
} from './tag/tag-groups';

// Define a simplified ItemTag interface to avoid circular references
export interface ItemTag {
  id: string;
  tag_id: string;
  tags: {
    id: string;
    name: string;
    category?: string;
    created_at?: string;
  } | null;
}
