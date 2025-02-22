
import { supabase } from "@/integrations/supabase/client";

export interface Tag {
  id: string;
  name: string;
  category: string | null;
  created_at: string;
}

export interface ItemTag {
  id: string;
  tag_id: string;
  tags?: Tag;
}

export const getTagsForItem = async (itemId: string, isUserItem: boolean): Promise<ItemTag[]> => {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  const idColumn = isUserItem ? "user_item_id" : "official_item_id";

  const { data, error } = await supabase
    .from(tableName)
    .select(`
      id,
      tag_id,
      tags:tags(*)
    `)
    .eq(idColumn, itemId);

  if (error) throw error;
  return data || [];
};

export const addTagToItem = async (
  itemId: string,
  tagId: string,
  isUserItem: boolean
): Promise<void> => {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  const idColumn = isUserItem ? "user_item_id" : "official_item_id";

  const { error } = await supabase
    .from(tableName)
    .insert([{ [idColumn]: itemId, tag_id: tagId }]);

  if (error) throw error;
};

export const removeTagFromItem = async (
  itemId: string,
  tagId: string,
  isUserItem: boolean
): Promise<void> => {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  const idColumn = isUserItem ? "user_item_id" : "official_item_id";

  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq(idColumn, itemId)
    .eq("tag_id", tagId);

  if (error) throw error;
};

export const deleteUserItem = async (userItemId: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from("user_items")
      .delete()
      .eq("id", userItemId);

    return { error: error as Error | null };
  } catch (error) {
    return { error: error as Error };
  }
};
