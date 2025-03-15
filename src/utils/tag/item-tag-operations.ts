import { supabase } from "@/integrations/supabase/client";

// SimpleItemTagの型定義を追加（無限ループを防ぐため）
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

export interface ItemTag {
  id: string;
  item_id: string;
  tag_id: string;
  created_at?: string;
}

export type TagUpdate = {
  category: string;
  value: string | null;
}

// 型循環問題を修正するために、関数の戻り値型を明示的にSimpleItemTag[]に変更
export const getTagsForItem = async (itemId: string, isUserItem: boolean = false): Promise<SimpleItemTag[]> => {
  try {
    if (!itemId) {
      console.error("No item ID provided");
      return [];
    }

    const table = isUserItem ? "user_item_tags" : "official_item_tags";

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
      .eq("item_id", itemId);

    if (error) {
      console.error("Error fetching tags for item:", error);
      return [];
    }

    return itemTags || [];
  } catch (error) {
    console.error("Error in getTagsForItem:", error);
    return [];
  }
};

export const addTagToItem = async (tagId: string, itemId: string, isUserItem: boolean = false): Promise<ItemTag | null> => {
  try {
    const table = isUserItem ? "user_item_tags" : "official_item_tags";

    const { data: existingTag, error: existingError } = await supabase
      .from(table)
      .select("*")
      .eq("item_id", itemId)
      .eq("tag_id", tagId)
      .single();

    if (existingError) {
      console.error("Error checking existing tag:", existingError);
      return null;
    }

    if (existingTag) {
      console.log("Tag already exists on item");
      return existingTag;
    }

    const { data, error } = await supabase
      .from(table)
      .insert([{ item_id: itemId, tag_id: tagId }])
      .select()
      .single();

    if (error) {
      console.error("Error adding tag to item:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in addTagToItem:", error);
    return null;
  }
};

export const removeTagFromItem = async (tagId: string, itemId: string, isUserItem: boolean = false): Promise<boolean> => {
  try {
    const table = isUserItem ? "user_item_tags" : "official_item_tags";

    const { data, error } = await supabase
      .from(table)
      .delete()
      .eq("item_id", itemId)
      .eq("tag_id", tagId);

    if (error) {
      console.error("Error removing tag from item:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in removeTagFromItem:", error);
    return false;
  }
};
