
import { supabase } from "@/integrations/supabase/client";

// 循環参照を避けるため、型を直接定義
interface Tag {
  id: string;
  name: string;
  category?: string;
  created_at?: string;
}

interface SimpleItemTag {
  id: string;
  tag_id: string;
  tags: Tag | null;
}

export async function getTagsForItem(itemId: string, isUserItem: boolean = false): Promise<SimpleItemTag[]> {
  if (!itemId) return [];
  
  const table = isUserItem ? "user_item_tags" : "item_tags";
  const itemIdField = isUserItem ? "user_item_id" : "official_item_id";

  try {
    console.log(`Fetching tags for ${isUserItem ? 'user' : 'official'} item: ${itemId}`);
    
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
    
    console.log(`Raw tag data for item ${itemId}:`, data);
    
    // Ensure each item has the required fields and valid tag data
    const processedData = (data || []).map(item => {
      console.log(`Processing tag item:`, item);
      
      // タグ情報が正しく取得されているか確認
      if (!item.tags) {
        console.warn(`Tag data is null for tag_id: ${item.tag_id}`);
        return null;
      }
      
      return {
        id: item.id,
        tag_id: item.tag_id,
        tags: item.tags
      };
    }).filter(Boolean); // null値を除去
    
    console.log(`Processed tag data for item ${itemId}:`, processedData);
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
