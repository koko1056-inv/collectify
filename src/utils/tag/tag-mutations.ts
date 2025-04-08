
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tag } from "@/types/tag"; // 正しいインポートパスを使用

/**
 * アイテムにタグを追加する関数
 * @param itemId アイテムID
 * @param tagId タグID
 * @returns 成功時はtrue、失敗時はfalse
 */
export const addTagToItem = async (
  itemId: string,
  tagId: string
): Promise<boolean> => {
  try {
    console.log(`Adding tag ${tagId} to item ${itemId}`);
    
    // すでに存在するかチェック
    const { count, error: countError } = await supabase
      .from("user_item_tags")
      .select("*", { count: "exact", head: true })
      .eq("user_item_id", itemId)
      .eq("tag_id", tagId);
    
    if (countError) {
      console.error("Error checking existing tag:", countError);
      return false;
    }
    
    // すでに追加されている場合は成功として返す
    if (count && count > 0) {
      console.log("Tag already exists on this item");
      return true;
    }
    
    // タグの追加
    const { error } = await supabase
      .from("user_item_tags")
      .insert({ 
        user_item_id: itemId, 
        tag_id: tagId 
      });
    
    if (error) {
      console.error("Error adding tag to item:", error);
      return false;
    }
    
    console.log(`Successfully added tag ${tagId} to item ${itemId}`);
    return true;
  } catch (error) {
    console.error("Error in addTagToItem:", error);
    return false;
  }
};

/**
 * アイテムからタグを削除する関数
 * @param itemId アイテムID
 * @param tagId タグID
 * @returns 成功時はtrue、失敗時はfalse
 */
export const removeTagFromItem = async (
  itemId: string,
  tagId: string
): Promise<boolean> => {
  try {
    console.log(`Removing tag ${tagId} from item ${itemId}`);
    
    const { error } = await supabase
      .from("user_item_tags")
      .delete()
      .match({ 
        user_item_id: itemId, 
        tag_id: tagId 
      });
    
    if (error) {
      console.error("Error removing tag from item:", error);
      return false;
    }
    
    console.log(`Successfully removed tag ${tagId} from item ${itemId}`);
    return true;
  } catch (error) {
    console.error("Error in removeTagFromItem:", error);
    return false;
  }
};
