
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "@/types/tag";

// Define a simpler ItemTag interface that doesn't cause circular references
export interface ItemTag {
  id: string;
  tag_id: string;
  tags: {
    id: string;
    name: string;
    category?: string;
    created_at?: string;
  } | null;
}

/**
 * ID配列からタグを取得する
 */
export const getTagsByIds = async (tagIds: string[]): Promise<Tag[]> => {
  if (!tagIds.length) return [];
  
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .in("id", tagIds);
  
  if (error) throw error;
  return data || [];
};

/**
 * アイテムに関連するタグを取得する
 */
export const getTagsForItem = async (
  itemId: string,
  isUserItem: boolean = false
): Promise<ItemTag[]> => {
  try {
    const table = isUserItem ? "user_item_tags" : "item_tags";
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
      .eq(isUserItem ? "user_item_id" : "official_item_id", itemId);

    if (error) throw error;

    // Explicitly type the result to avoid circular references
    return data as ItemTag[] || [];
  } catch (error) {
    console.error(`Error fetching tags for item ${itemId}:`, error);
    return [];
  }
};
