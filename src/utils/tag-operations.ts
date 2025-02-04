import { supabase } from "@/integrations/supabase/client";
import { Tag, ItemTag, TableName } from "@/types/tag";

export async function getTagsForItem(itemId: string, isUserItem: boolean = false): Promise<ItemTag[]> {
  const table = isUserItem ? "user_item_tags" : "item_tags";
  const idColumn = isUserItem ? "user_item_id" : "official_item_id";

  const { data, error } = await supabase
    .from(table)
    .select(`
      id,
      tag_id,
      created_at,
      tags (
        id,
        name,
        is_category
      )
    `)
    .eq(idColumn, itemId);

  if (error) throw error;
  return data || [];
}

export async function addTagToItem(
  tagId: string,
  itemId: string,
  isUserItem: boolean = false
): Promise<void> {
  const table = isUserItem ? "user_item_tags" : "item_tags";
  const idColumn = isUserItem ? "user_item_id" : "official_item_id";

  const { error } = await supabase
    .from(table)
    .insert({
      tag_id: tagId,
      [idColumn]: itemId,
    });

  if (error) throw error;
}

export async function removeTagFromItem(
  tagId: string,
  itemId: string,
  isUserItem: boolean = false
): Promise<void> {
  const table = isUserItem ? "user_item_tags" : "item_tags";
  const idColumn = isUserItem ? "user_item_id" : "official_item_id";

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("tag_id", tagId)
    .eq(idColumn, itemId);

  if (error) throw error;
}

export async function deleteRelatedRecords(table: TableName, itemId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("user_item_id", itemId);
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function deleteUserItem(itemId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from("user_items")
      .delete()
      .eq("id", itemId);
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}