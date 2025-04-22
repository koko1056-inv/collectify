
import { supabase } from "@/integrations/supabase/client";

// アイテムのコンテンツ名を設定
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
    return { error: null };
  } catch (error) {
    console.error("Error setting content name:", error);
    return { error };
  }
};

// コンテンツごとにアイテムをグループ化
export const getItemsByContent = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("user_items")
      .select(`
        id, 
        title, 
        image, 
        content_name,
        quantity
      `)
      .eq("user_id", userId)
      .order("content_name", { ascending: true })
      .order("title", { ascending: true });
    
    if (error) throw error;
    
    // コンテンツ名でグループ化
    const groupedItems: Record<string, any[]> = {};
    
    data.forEach(item => {
      const contentKey = item.content_name || "未分類";
      if (!groupedItems[contentKey]) {
        groupedItems[contentKey] = [];
      }
      groupedItems[contentKey].push(item);
    });
    
    return groupedItems;
  } catch (error) {
    console.error("Error fetching items by content:", error);
    return {};
  }
};

// 利用可能なすべてのコンテンツ名を取得
export const getAllContentNames = async () => {
  try {
    const { data, error } = await supabase
      .from("content_names")
      .select("*")
      .order("name", { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching content names:", error);
    return [];
  }
};
