
import { supabase } from "@/integrations/supabase/client";
import { SimpleItemTag } from "./types";

/**
 * アイテムにタグを追加する関数
 */
export async function addTagToItem(
  itemId: string,
  tagId: string,
  isUserItem: boolean = false
): Promise<SimpleItemTag | null> {
  try {
    const table = isUserItem ? "user_item_tags" : "item_tags";
    const itemIdField = isUserItem ? "user_item_id" : "official_item_id";

    // タグが既に追加されているか確認
    const { data: existingTag, error: checkError } = await supabase
      .from(table)
      .select("id")
      .eq(itemIdField, itemId)
      .eq("tag_id", tagId)
      .maybeSingle();

    if (checkError) throw checkError;

    // 既に存在する場合は追加しない
    if (existingTag) return null;

    // ユーザーIDを取得（ユーザーアイテムの場合のみ使用）
    let userId = null;
    if (isUserItem) {
      const { data: userData } = await supabase.auth.getUser();
      userId = userData.user?.id;
    }

    // 挿入データを準備
    const insertData: any = {
      [itemIdField]: itemId,
      tag_id: tagId,
    };

    // ユーザーアイテムの場合はユーザーIDも追加
    if (isUserItem && userId) {
      insertData.user_id = userId;
    }

    // タグを追加
    const { data, error } = await supabase
      .from(table)
      .insert(insertData)
      .select(`
        tag_id,
        tags:tag_id (
          id,
          name,
          category
        )
      `)
      .single();

    if (error) throw error;
    
    // SimpleItemTagの形式に変換して返す
    return {
      tag_id: data.tag_id,
      tags: data.tags || {
        id: '',
        name: '',
        category: ''
      }
    };
  } catch (error) {
    console.error("Error adding tag to item:", error);
    return null;
  }
}

/**
 * アイテムからタグを削除する関数
 */
export async function removeTagFromItem(
  tagId: string,
  itemId: string,
  isUserItem: boolean = false
): Promise<boolean> {
  try {
    const table = isUserItem ? "user_item_tags" : "item_tags";
    const itemIdField = isUserItem ? "user_item_id" : "official_item_id";

    const { error } = await supabase
      .from(table)
      .delete()
      .eq(itemIdField, itemId)
      .eq("tag_id", tagId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error removing tag from item:", error);
    return false;
  }
}
