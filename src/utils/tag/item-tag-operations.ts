
import { supabase } from "@/integrations/supabase/client";

// SimpleItemTagの型定義（無限ループを防ぐため）
export interface SimpleItemTag {
  id: string;
  tag_id: string;
  tags: {
    id: string;
    name: string;
    category?: string;
    created_at?: string;
  } | null;
}

// ItemTagの新しい定義：item_idを使用しない
export interface ItemTag {
  id: string;
  tag_id: string;
  // item_idはテーブルによって異なるフィールド名を持つため、ここで定義しない
  created_at?: string;
}

export type TagUpdate = {
  category: string;
  value: string | null;
}

// アイテムのタグを取得する関数（ユーザーアイテムか公式アイテムかによって異なるテーブルを使用）
export const getTagsForItem = async (itemId: string, isUserItem: boolean = false): Promise<SimpleItemTag[]> => {
  try {
    if (!itemId) {
      console.error("No item ID provided");
      return [];
    }

    // ユーザーアイテムの場合はuser_item_tags、公式アイテムの場合はitem_tagsを使用
    const table = isUserItem ? "user_item_tags" : "item_tags";
    const itemIdField = isUserItem ? "user_item_id" : "official_item_id";

    const { data: itemTags, error } = await supabase
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
      .eq(itemIdField, itemId);

    if (error) {
      console.error(`Error fetching tags for item from ${table}:`, error);
      return [];
    }

    return itemTags || [];
  } catch (error) {
    console.error("Error in getTagsForItem:", error);
    return [];
  }
};

// アイテムにタグを追加する関数
export const addTagToItem = async (itemId: string, tagId: string, isUserItem: boolean = false): Promise<ItemTag | null> => {
  try {
    // ユーザーアイテムの場合はuser_item_tags、公式アイテムの場合はitem_tagsを使用
    const table = isUserItem ? "user_item_tags" : "item_tags";
    const itemIdField = isUserItem ? "user_item_id" : "official_item_id";

    // 既に存在するタグかチェック
    const { data: existingTag, error: existingError } = await supabase
      .from(table)
      .select("*")
      .eq(itemIdField, itemId)
      .eq("tag_id", tagId)
      .maybeSingle();

    if (existingError) {
      console.error(`Error checking existing tag in ${table}:`, existingError);
      return null;
    }

    if (existingTag) {
      console.log("Tag already exists on item");
      return existingTag as unknown as ItemTag; // 型キャストを安全に行う
    }

    // タグを追加
    const insertData = isUserItem 
      ? { user_item_id: itemId, tag_id: tagId }
      : { official_item_id: itemId, tag_id: tagId };

    const { data, error } = await supabase
      .from(table)
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error(`Error adding tag to item in ${table}:`, error);
      return null;
    }

    return data as unknown as ItemTag; // 型キャストを安全に行う
  } catch (error) {
    console.error("Error in addTagToItem:", error);
    return null;
  }
};

// アイテムからタグを削除する関数
export const removeTagFromItem = async (tagId: string, itemId: string, isUserItem: boolean = false): Promise<boolean> => {
  try {
    // ユーザーアイテムの場合はuser_item_tags、公式アイテムの場合はitem_tagsを使用
    const table = isUserItem ? "user_item_tags" : "item_tags";
    const itemIdField = isUserItem ? "user_item_id" : "official_item_id";

    const { error } = await supabase
      .from(table)
      .delete()
      .eq(itemIdField, itemId)
      .eq("tag_id", tagId);

    if (error) {
      console.error(`Error removing tag from item in ${table}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in removeTagFromItem:", error);
    return false;
  }
};

// 公式アイテムのタグをユーザーアイテムにコピーする関数
export const copyTagsFromOfficialItem = async (officialItemId: string, userItemId: string): Promise<boolean> => {
  try {
    // 公式アイテムのタグを取得
    const officialTags = await getTagsForItem(officialItemId, false);
    
    if (!officialTags.length) {
      console.log("No tags to copy from official item");
      return true;
    }
    
    // 各タグをユーザーアイテムに追加
    for (const tag of officialTags) {
      if (tag.tag_id) {
        await addTagToItem(userItemId, tag.tag_id, true);
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error copying tags from official item:", error);
    return false;
  }
};
