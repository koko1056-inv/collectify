
import { supabase } from "@/integrations/supabase/client";

/**
 * アイテムに関連するタグを取得する
 * @param itemId アイテムID
 * @param isUserItem ユーザーアイテムかどうか
 * @returns タグのリスト
 */
export async function getTagsForItem(itemId: string, isUserItem: boolean = false) {
  try {
    const table = isUserItem ? "user_item_tags" : "item_tags";
    const idColumn = isUserItem ? "user_item_id" : "official_item_id";
    
    const { data, error } = await supabase
      .from(table)
      .select(`
        id,
        tag_id,
        tags (
          id,
          name,
          category,
          created_at
        )
      `)
      .eq(idColumn, itemId);
    
    if (error) {
      console.error(`Error getting tags for item: ${error.message}`);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error("Error in getTagsForItem:", error);
    return [];
  }
}

/**
 * アイテムがユーザーのコレクションに存在するかを確認する
 * @param userId ユーザーID
 * @param officialItemId 公式アイテムID
 * @returns アイテムが存在する場合はtrueを返す
 */
export async function isItemInUserCollection(userId: string, officialItemId: string) {
  try {
    const { data, error } = await supabase
      .from("user_items")
      .select("id")
      .eq("user_id", userId)
      .eq("official_item_id", officialItemId)
      .maybeSingle();
    
    if (error) {
      console.error(`Error checking if item exists: ${error.message}`);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error("Error in isItemInUserCollection:", error);
    return false;
  }
}
