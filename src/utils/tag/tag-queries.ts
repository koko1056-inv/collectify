
import { supabase } from "@/integrations/supabase/client";
import { SimpleTag, SimpleItemTag } from "./types";

// 特定のアイテムに関連するタグを取得
export async function getTagsForItem(
  itemId: string,
  isUserItem: boolean
): Promise<SimpleItemTag[]> {
  try {
    const { data, error } = await supabase
      .from(isUserItem ? "user_item_tags" : "item_tags")
      .select(`
        tag_id,
        tags (
          id,
          name,
          category,
          created_at
        )
      `)
      .eq(isUserItem ? "user_item_id" : "official_item_id", itemId);

    if (error) {
      console.error("Error fetching tags for item:", error);
      return [];
    }

    return data as SimpleItemTag[];
  } catch (error) {
    console.error("Error in getTagsForItem:", error);
    return [];
  }
}

// アイテムがユーザーのコレクションに存在するかチェック
export async function isItemInUserCollection(
  itemId: string,
  userId: string
): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from("user_items")
      .select("*", { count: 'exact', head: true })
      .eq("official_item_id", itemId)
      .eq("user_id", userId);
    
    if (error) {
      console.error("Error checking if item is in collection:", error);
      return false;
    }
    
    return (count || 0) > 0;
  } catch (error) {
    console.error("Error in isItemInUserCollection:", error);
    return false;
  }
}
