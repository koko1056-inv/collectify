
// This file is kept for backward compatibility.
// It re-exports all functions from the new modular structure.
import { supabase } from "@/integrations/supabase/client";
export * from './tag/index';

// タグ追加と削除関数を直接エクスポート
export { addTagToItem, removeTagFromItem } from './tag/tag-mutations';
export { 
  isItemInUserCollection,
  getTagsForItem
} from './tag/tag-queries';
export {
  findTagIdByName,
  isSimpleTag
} from './tag/tag-search';
export {
  getItemsGroupedByTag
} from './tag/tag-groups';

// ユーザーアイテムからランダムにアイテムを取得する関数
export async function getRandomUserItem(userId: string) {
  if (!userId) return null;
  
  try {
    const { data, error } = await supabase
      .from('user_items')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    if (!data || data.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * data.length);
    return data[randomIndex];
  } catch (error) {
    console.error('Error getting random user item:', error);
    return null;
  }
}

// 公式アイテムからユーザーアイテムにタグをコピーする関数
export async function copyTagsFromOfficialItem(officialItemId: string, userItemId: string) {
  if (!officialItemId || !userItemId) return false;
  
  try {
    // 公式アイテムのタグを取得
    const { data: officialTags, error: tagsError } = await supabase
      .from('item_tags')
      .select('tag_id')
      .eq('official_item_id', officialItemId);
    
    if (tagsError) throw tagsError;
    if (!officialTags || officialTags.length === 0) return true;
    
    // ユーザーIDを取得
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    // タグをコピー
    for (const tag of officialTags) {
      const { error: insertError } = await supabase
        .from('user_item_tags')
        .insert({
          user_item_id: userItemId,
          tag_id: tag.tag_id,
          ...(userId && { user_id: userId })
        });
      
      if (insertError) console.error('Error copying tag:', insertError);
    }
    
    return true;
  } catch (error) {
    console.error('Error copying tags from official item:', error);
    return false;
  }
}

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
