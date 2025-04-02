
import { supabase } from "@/integrations/supabase/client";

// 関数の返り値の型を定義
interface TagOperationResult {
  success: boolean;
  error?: any;
}

// アイテムにタグを追加
export async function addTagToItem(
  itemId: string,
  tagId: string,
  isUserItem = true
): Promise<TagOperationResult> {
  try {
    // テーブル名の決定
    const tableName = isUserItem ? "user_item_tags" : "item_tags";
    
    // まず、このタグがすでに追加されているか確認
    const { data: existingTags, error: checkError } = await supabase
      .from(tableName)
      .select("*")
      .eq(isUserItem ? "user_item_id" : "official_item_id", itemId)
      .eq("tag_id", tagId);

    if (checkError) {
      console.error("Error checking existing tags:", checkError);
      return { success: false, error: checkError };
    }

    // すでに存在する場合は追加しない
    if (existingTags && existingTags.length > 0) {
      console.log("Tag already exists for this item");
      return { success: true }; // 既に追加済みなので成功とみなす
    }

    // 新しいタグを追加
    const insertData = isUserItem 
      ? { user_item_id: itemId, tag_id: tagId } 
      : { official_item_id: itemId, tag_id: tagId };

    const { error } = await supabase
      .from(tableName)
      .insert(insertData);
        
    if (error) {
      console.error(`Error adding tag to ${isUserItem ? 'user' : 'official'} item:`, error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in addTagToItem:", error);
    return { success: false, error };
  }
}

// アイテムからタグを削除
export async function removeTagFromItem(
  tagId: string,
  itemId: string,
  isUserItem = true
): Promise<TagOperationResult> {
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
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error(`Error in removeTagFromItem:`, error);
    return { success: false, error };
  }
}
