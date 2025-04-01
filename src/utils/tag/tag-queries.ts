import { supabase } from "@/integrations/supabase/client";

// 特定のアイテムIDのタグを取得
export async function getTagsForItem(
  itemId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from("user_item_tags")
    .select(`
      id,
      tag_id,
      tags:tag_id (
        id,
        name,
        category
      )
    `)
    .eq("user_item_id", itemId);

  if (error) {
    console.error("Error fetching tags for item:", error);
    return [];
  }

  return data || [];
}

// ユーザーのコレクションにアイテムが存在するか確認
export async function isItemInUserCollection(
  userId: string,
  itemId: string
): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from("user_items")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", userId)
      .eq("id", itemId);
    
    if (error) {
      console.error("Error checking if item is in user collection:", error);
      return false;
    }
    
    return (count || 0) > 0;
  } catch (error) {
    console.error("Error in isItemInUserCollection:", error);
    return false;
  }
}
