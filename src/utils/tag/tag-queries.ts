
import { supabase } from '@/integrations/supabase/client';

/**
 * アイテムがユーザーのコレクションに存在するか確認
 */
export const isItemInUserCollection = async (
  officialItemId: string,
  userId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('user_items')
    .select('id')
    .eq('official_item_id', officialItemId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error checking if item exists in collection:', error);
    return false;
  }

  return !!data;
};

/**
 * アイテムに対するタグを取得
 */
export const getTagsForItem = async (
  itemId: string,
  isUserItem: boolean
): Promise<any[]> => {
  const table = isUserItem ? 'user_item_tags' : 'item_tags';
  const idField = isUserItem ? 'user_item_id' : 'official_item_id';

  const { data, error } = await supabase
    .from(table)
    .select(`
      id,
      tag_id,
      tags (
        id,
        name,
        category
      )
    `)
    .eq(idField, itemId);

  if (error) {
    console.error('Error fetching tags for item:', error);
    return [];
  }

  return data || [];
};
