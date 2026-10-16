
import { supabase } from "@/integrations/supabase/client";

/** 手放した理由（交換は交換の成立時にサーバーが記録する） */
export type ReleaseReason = "sold" | "gift" | "other";

/**
 * ユーザーアイテムを削除する。
 * release を渡すと、消す前の内容を「手放した」（past_items）に記録する（登録ミスで消すときは渡さない）。
 */
export const deleteUserItem = async (itemId: string, options: { release?: ReleaseReason } = {}) => {
  try {
    // 交換が成立して進行中の品は消せない。先に確かめておかないと、いいね等だけ消えて途中で止まる
    const { data: inTrade } = await supabase.rpc("trade_item_in_progress", { _item: itemId });
    if (inTrade) {
      return { error: { message: "trade_in_progress" }, officialItemId: null };
    }

    // Get the official_item_id before deleting
    const { data: userItem, error: fetchError } = await supabase
      .from("user_items")
      .select("user_id, official_item_id, title, image, content_name, quantity, purchase_price, purchase_date, purchase_shop")
      .eq("id", itemId)
      .single();
    
    if (fetchError) throw fetchError;
    const officialItemId = userItem?.official_item_id;
    
    // Delete related likes first to avoid foreign key constraint errors
    const { error: likesError } = await supabase
      .from("user_item_likes")
      .delete()
      .eq("user_item_id", itemId);
    
    if (likesError) throw likesError;
    
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

    // 手放した記録。消せたあとに書く（記録だけ残って本体が消えない、を避ける）。書けなくても削除は成功として扱う
    if (options.release && userItem) {
      const { error: pastError } = await supabase.from("past_items").insert({
        user_id: userItem.user_id,
        official_item_id: userItem.official_item_id,
        title: (userItem.title || "").slice(0, 300),
        image: userItem.image,
        content_name: userItem.content_name,
        quantity: Math.min(999, Math.max(1, userItem.quantity ?? 1)),
        reason: options.release,
        purchase_price: userItem.purchase_price,
        purchase_date: userItem.purchase_date,
        purchase_shop: userItem.purchase_shop,
      });
      if (pastError) console.error("Error recording past item:", pastError);
    }

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
