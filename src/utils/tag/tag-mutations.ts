
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

// アイテムにタグを追加
export async function addTagToItem(
  itemId: string,
  tagId: string,
  isUserItem = true
): Promise<boolean> {
  try {
    // テーブル名の決定
    const tableName = isUserItem ? "user_item_tags" : "item_tags";
    const itemIdField = isUserItem ? "user_item_id" : "official_item_id";
    
    // まず、このタグがすでに追加されているか確認
    const { data: existingTags, error: checkError } = await supabase
      .from(tableName)
      .select("*")
      .eq(itemIdField, itemId)
      .eq("tag_id", tagId);

    if (checkError) {
      console.error("Error checking existing tags:", checkError);
      return false;
    }

    // すでに存在する場合は追加しない
    if (existingTags && existingTags.length > 0) {
      console.log("Tag already exists for this item");
      return true; // 既に追加済みなので成功とみなす
    }

    // 新しいタグを追加
    const { error } = await supabase
      .from(tableName)
      .insert({
        [itemIdField]: itemId,
        tag_id: tagId
      });

    if (error) {
      console.error("Error adding tag to item:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in addTagToItem:", error);
    return false;
  }
}

// アイテムからタグを削除
export async function removeTagFromItem(
  tagId: string,
  itemId: string,
  isUserItem = true
): Promise<boolean> {
  try {
    // テーブル名の決定
    const tableName = isUserItem ? "user_item_tags" : "item_tags";
    const itemIdField = isUserItem ? "user_item_id" : "official_item_id";
    
    const { error } = await supabase
      .from(tableName)
      .delete()
      .match({
        [itemIdField]: itemId,
        tag_id: tagId
      });

    if (error) {
      console.error(`Error removing tag from ${isUserItem ? 'user' : 'official'} item:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error in removeTagFromItem:`, error);
    return false;
  }
}
