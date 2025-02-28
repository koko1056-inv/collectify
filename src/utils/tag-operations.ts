
import { supabase } from "@/integrations/supabase/client";

/**
 * アイテムからタグを削除する
 */
export const removeTagFromItem = async (
  tagId: string,
  itemId: string,
  isUserItem: boolean = false
) => {
  const table = isUserItem ? "user_item_tags" : "item_tags";
  const idField = isUserItem ? "user_item_id" : "official_item_id";

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("tag_id", tagId)
    .eq(idField, itemId);

  if (error) throw error;
  
  return { success: true };
};

/**
 * アイテムにタグを追加する
 */
export const addTagToItem = async (
  itemId: string,
  tagId: string,
  isUserItem: boolean = false
) => {
  const table = isUserItem ? "user_item_tags" : "item_tags";
  const idField = isUserItem ? "user_item_id" : "official_item_id";

  // 既に存在するかチェック
  const { data: existingTag, error: checkError } = await supabase
    .from(table)
    .select("*")
    .eq("tag_id", tagId)
    .eq(idField, itemId)
    .maybeSingle();

  if (checkError) throw checkError;

  // 既に存在する場合は追加しない
  if (existingTag) {
    return { success: true, exists: true };
  }

  // タグを追加
  if (isUserItem) {
    const { error } = await supabase
      .from("user_item_tags")
      .insert({
        tag_id: tagId,
        user_item_id: itemId,
      });
    
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("item_tags")
      .insert({
        tag_id: tagId,
        official_item_id: itemId,
      });
    
    if (error) throw error;
  }
  
  return { success: true, exists: false };
};

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
      .from("item_memories")  // "memories" テーブルではなく "item_memories" テーブルを使用
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

/**
 * アイテムに関連するタグを取得する
 */
export const getTagsForItem = async (
  itemId: string,
  isUserItem: boolean = false
) => {
  try {
    const table = isUserItem ? "user_item_tags" : "item_tags";
    const idField = isUserItem ? "user_item_id" : "official_item_id";

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
      .eq(idField, itemId);

    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error(`Error fetching tags for item ${itemId}:`, error);
    return [];
  }
};

/**
 * ID配列からタグを取得する
 */
export const getTagsByIds = async (tagIds: string[]) => {
  if (!tagIds.length) return [];
  
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .in("id", tagIds);
  
  if (error) throw error;
  return data;
};
