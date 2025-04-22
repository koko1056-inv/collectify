
import { supabase } from "@/integrations/supabase/client";

// ユーザーアイテムを削除する関数
export const deleteUserItem = async (itemId: string) => {
  try {
    // 元の公式アイテムIDを取得しておく
    const { data: userItem } = await supabase
      .from("user_items")
      .select("official_item_id")
      .eq("id", itemId)
      .maybeSingle();
    
    const officialItemId = userItem?.official_item_id;

    // 関連するタグの削除
    await supabase
      .from("user_item_tags")
      .delete()
      .eq("user_item_id", itemId);

    // 関連するいいねの削除
    await supabase
      .from("user_item_likes")
      .delete()
      .eq("user_item_id", itemId);

    // 関連する思い出の削除
    await supabase
      .from("item_memories")
      .delete()
      .eq("user_item_id", itemId);

    // 関連するトレードリクエストの削除
    await supabase
      .from("trade_requests")
      .delete()
      .or(`offered_item_id.eq.${itemId},requested_item_id.eq.${itemId}`);

    // ユーザーアイテム自体の削除
    const { error } = await supabase
      .from("user_items")
      .delete()
      .eq("id", itemId);

    if (error) throw error;

    return { error: null, officialItemId };
  } catch (error) {
    console.error("Error deleting user item:", error);
    return { error, officialItemId: null };
  }
};

// コンテンツ名を設定する関数（一時的にここに配置）
export const setUserItemContent = async (itemId: string, contentName: string | null) => {
  try {
    const { error } = await supabase
      .from("user_items")
      .update({ content_name: contentName })
      .eq("id", itemId);
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error("Error setting content name:", error);
    return { error };
  }
};
