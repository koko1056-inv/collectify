
import { supabase } from "@/integrations/supabase/client";

/**
 * アイテムのコンテンツを設定する
 */
export const setItemContent = async (
  itemId: string, 
  contentName: string | null,
  isUserItem: boolean = false
) => {
  try {
    const table = isUserItem ? "user_items" : "official_items";
    
    const { error } = await supabase
      .from(table)
      .update({ content_name: contentName })
      .eq("id", itemId);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error(`Error setting content for item ${itemId}:`, error);
    throw error;
  }
};

/**
 * 利用可能なコンテンツ名の一覧を取得する
 */
export const getAllContentNames = async () => {
  try {
    const { data, error } = await supabase
      .from("content_names")
      .select("*")
      .order("name");
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching content names:", error);
    return [];
  }
};
