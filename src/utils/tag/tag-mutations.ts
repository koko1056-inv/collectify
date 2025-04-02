
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

// アイテムにタグを追加
export async function addTagToItem(
  itemId: string,
  tagId: string
): Promise<boolean> {
  try {
    // まず、このタグがすでに追加されているか確認
    const { data: existingTags, error: checkError } = await supabase
      .from("user_item_tags")
      .select("*")
      .eq("user_item_id", itemId)
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
      .from("user_item_tags")
      .insert({
        user_item_id: itemId,
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
  itemId: string,
  tagId: string
): Promise<boolean> {
  try {
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

    return true;
  } catch (error) {
    console.error("Error in removeTagFromItem:", error);
    return false;
  }
}

// オフィシャルアイテムにタグを追加
export async function addTagToOfficialItem(
  itemId: string,
  tagId: string
): Promise<boolean> {
  try {
    // 既にタグが追加されているか確認
    const { data: existingTags, error: checkError } = await supabase
      .from("item_tags")
      .select("*")
      .eq("official_item_id", itemId)
      .eq("tag_id", tagId);
      
    if (checkError) {
      console.error("Error checking existing tags:", checkError);
      return false;
    }
    
    // 既に存在する場合は追加しない
    if (existingTags && existingTags.length > 0) {
      console.log("Tag already exists for this official item");
      return true; // 既に追加済みなので成功とみなす
    }
    
    // 新しいタグを追加
    const { error } = await supabase
      .from("item_tags")
      .insert({
        official_item_id: itemId,
        tag_id: tagId
      });
      
    if (error) {
      console.error("Error adding tag to official item:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in addTagToOfficialItem:", error);
    return false;
  }
}

// オフィシャルアイテムからタグを削除
export async function removeTagFromOfficialItem(
  itemId: string,
  tagId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("item_tags")
      .delete()
      .match({
        official_item_id: itemId,
        tag_id: tagId
      });
      
    if (error) {
      console.error("Error removing tag from official item:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in removeTagFromOfficialItem:", error);
    return false;
  }
}
