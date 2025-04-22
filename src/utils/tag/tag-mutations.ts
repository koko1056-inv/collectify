
import { supabase } from "@/integrations/supabase/client";

// アイテムにタグを追加する関数
export const addTagToItem = async (
  itemId: string,
  tagId: string,
  isUserItem: boolean = false
) => {
  try {
    const tableName = isUserItem ? "user_item_tags" : "item_tags";
    const itemColumn = isUserItem ? "user_item_id" : "official_item_id";
    
    // まず既存のタグをチェック
    const { data: existingTag, error: checkError } = await supabase
      .from(tableName)
      .select("id")
      .eq(itemColumn, itemId)
      .eq("tag_id", tagId)
      .maybeSingle();
    
    if (checkError) throw checkError;
    
    // すでに存在する場合は早期リターン
    if (existingTag) return { error: null };
    
    // 存在しない場合は新規作成
    const { error } = await supabase
      .from(tableName)
      .insert({
        [itemColumn]: itemId,
        tag_id: tagId,
      });
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error(`Error adding tag to ${isUserItem ? 'user' : 'official'} item:`, error);
    return { error };
  }
};

// アイテムからタグを削除する関数
export const removeTagFromItem = async (
  tagId: string,
  itemId: string,
  isUserItem: boolean = false
) => {
  try {
    const tableName = isUserItem ? "user_item_tags" : "item_tags";
    const itemColumn = isUserItem ? "user_item_id" : "official_item_id";
    
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq(itemColumn, itemId)
      .eq("tag_id", tagId);
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error(`Error removing tag from ${isUserItem ? 'user' : 'official'} item:`, error);
    return { error };
  }
};

// 複数のタグを一度に更新する関数
export const updateItemTags = async (
  itemId: string,
  tagUpdates: Array<{ category: string, value: string | null }>,
  isUserItem: boolean = false
) => {
  try {
    for (const update of tagUpdates) {
      if (update.value) {
        await addTagToItem(itemId, update.value, isUserItem);
      }
      // TODO: タグが外された場合の処理を追加
    }
    return { error: null };
  } catch (error) {
    console.error(`Error updating tags for item:`, error);
    return { error };
  }
};
