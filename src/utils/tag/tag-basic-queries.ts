import { supabase } from "@/integrations/supabase/client";
import { Tag, SimpleItemTag } from "@/types/tag";

/**
 * アイテムのタグを取得する関数
 */
export async function getTagsForItem(itemId: string, isUserItem: boolean = false): Promise<SimpleItemTag[]> {
  if (!itemId) return [];
  
  const table = isUserItem ? "user_item_tags" : "item_tags";
  const itemIdField = isUserItem ? "user_item_id" : "official_item_id";

  try {
    const { data, error } = await supabase
      .from(table)
      .select(`
        id,
        tag_id,
        tags:tag_id (
          id,
          name,
          category,
          created_at
        )
      `)
      .eq(itemIdField, itemId);

    if (error) {
      console.error(`Error fetching tags for item ${itemId}:`, error);
      throw error;
    }
    
    // Ensure each item has the required fields and valid tag data
    const processedData = (data || []).map(item => {
      if (!item.tags) {
        return null;
      }
      
      return {
        id: item.id,
        tag_id: item.tag_id,
        tags: item.tags
      };
    }).filter(Boolean) as SimpleItemTag[];
    
    return processedData;
  } catch (error) {
    console.error("Error fetching tags for item:", error);
    return [];
  }
}

/**
 * 複数のアイテムのタグを一度に取得する関数
 */
export async function getTagsForMultipleItems(
  itemIds: string[], 
  isUserItem: boolean = false
): Promise<SimpleItemTag[]> {
  if (itemIds.length === 0) return [];
  
  const table = isUserItem ? "user_item_tags" : "item_tags";
  const itemIdField = isUserItem ? "user_item_id" : "official_item_id";

  try {
    const { data, error } = await supabase
      .from(table)
      .select(`
        id,
        tag_id,
        ${itemIdField},
        tags:tag_id (
          id,
          name,
          category,
          created_at
        )
      `)
      .in(itemIdField, itemIds);

    if (error) {
      console.error("Error fetching tags for multiple items:", error);
      return [];
    }
    
    if (!data) return [];
    
    return (data as any[]).map(item => ({
      id: item.id,
      tag_id: item.tag_id,
      tags: item.tags
    }));
  } catch (error) {
    console.error("Error fetching tags for multiple items:", error);
    return [];
  }
}

/**
 * アイテムがユーザーのコレクションに存在するか確認する関数
 */
export async function isItemInUserCollection(
  itemId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("user_items")
      .select("id")
      .eq("official_item_id", itemId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error checking item in user collection:", error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("Error checking item in user collection:", error);
    return false;
  }
}
