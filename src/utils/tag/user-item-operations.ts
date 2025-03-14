
import { supabase } from "@/integrations/supabase/client";

/**
 * ユーザーアイテムを削除する
 */
export const deleteUserItem = async (itemId: string) => {
  try {
    // Get the official_item_id before deleting
    const { data: userItem, error: fetchError } = await supabase
      .from("user_items")
      .select("official_item_id")
      .eq("id", itemId)
      .single();
    
    if (fetchError) throw fetchError;
    const officialItemId = userItem?.official_item_id;
    
    // Delete related tags
    const { error: tagsError } = await supabase
      .from("user_item_tags")
      .delete()
      .eq("user_item_id", itemId);
    
    if (tagsError) throw tagsError;
    
    // Delete related memories
    const { error: memoriesError } = await supabase
      .from("item_memories")
      .delete()
      .eq("user_item_id", itemId);
    
    if (memoriesError) throw memoriesError;
    
    // Delete the item itself
    const { error: deleteError } = await supabase
      .from("user_items")
      .delete()
      .eq("id", itemId);
    
    if (deleteError) throw deleteError;
    
    return { success: true, officialItemId };
  } catch (error) {
    console.error("Error deleting user item:", error);
    return { error, officialItemId: null };
  }
};

interface Tag {
  id: string;
  name: string;
}

interface UserItemTag {
  tags: Tag | null;
}

interface UserItem {
  id: string;
  title: string;
  image: string;
  user_item_tags?: UserItemTag[];
  [key: string]: any; // For other properties
}

/**
 * ランダムなユーザーアイテムを取得する
 */
export const getRandomUserItem = async (userId: string): Promise<UserItem | null> => {
  try {
    // ユーザーのアイテム総数を取得
    const { count, error: countError } = await supabase
      .from("user_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    
    if (countError) throw countError;
    if (!count || count === 0) return null;
    
    // ランダムなインデックスを生成
    const randomIndex = Math.floor(Math.random() * count);
    
    // ランダムなアイテムを取得
    const { data, error } = await supabase
      .from("user_items")
      .select(`
        *,
        user_item_tags (
          tags (
            id,
            name
          )
        )
      `)
      .eq("user_id", userId)
      .range(randomIndex, randomIndex);
    
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("Error fetching random user item:", error);
    return null;
  }
};
