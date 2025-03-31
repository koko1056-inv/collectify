
import { supabase } from "@/integrations/supabase/client";
import { SimpleItemTag } from "./types";

// アイテムに関連付けられたタグを取得する
export async function getTagsForItem(
  itemId: string | null,
  isUserItem: boolean = false
): Promise<SimpleItemTag[]> {
  if (!itemId) return [];

  try {
    // テーブル名を決定
    const tableName = isUserItem ? "user_item_tags" : "item_tags";
    const itemColumn = isUserItem ? "user_item_id" : "official_item_id";

    // タグを取得
    const { data, error } = await supabase
      .from(tableName)
      .select(`
        tag_id,
        tags:tag_id (
          id,
          name,
          category,
          created_at
        )
      `)
      .eq(itemColumn, itemId);

    if (error) {
      console.error(`Error fetching tags for ${tableName}:`, error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // 結果を変換して返す
    const result: SimpleItemTag[] = data
      .filter((item) => item.tags) // nullのタグをフィルタリング
      .map((item) => ({
        tag_id: item.tag_id,
        tags: item.tags ? {
          id: item.tags.id,
          name: item.tags.name,
          category: item.tags.category || "",
          created_at: item.tags.created_at || ""
        } : null
      }));
      
    return result.sort((a, b) => {
      if (a.tags && b.tags) {
        return a.tags.name.localeCompare(b.tags.name, 'ja');
      }
      return 0;
    });
  } catch (error) {
    console.error(`Error in getTagsForItem for ${itemId}:`, error);
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
