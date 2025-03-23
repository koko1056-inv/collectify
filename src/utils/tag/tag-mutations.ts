
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

  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("tag_id", tagId)
      .eq(idField, itemId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error removing tag:", error);
    throw error;
  }
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
  const insertData = isUserItem 
    ? { tag_id: tagId, user_item_id: itemId }
    : { tag_id: tagId, official_item_id: itemId };

  const { error } = await supabase
    .from(table)
    .insert(insertData);
  
  if (error) throw error;
  
  return { success: true, exists: false };
};
