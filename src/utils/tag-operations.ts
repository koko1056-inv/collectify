
import { supabase } from "@/integrations/supabase/client";
import { TableName, Tag, ItemTag } from "@/types/tag";

interface UserItemTag {
  tag_id: string;
  user_item_id: string;
}

interface OfficialItemTag {
  tag_id: string;
  official_item_id: string;
}

export async function getTagsForItem(itemId: string, isUserItem: boolean): Promise<ItemTag[]> {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  const idColumn = isUserItem ? "user_item_id" : "official_item_id";

  const { data, error } = await supabase
    .from(tableName)
    .select(`
      id,
      tag_id,
      tags (
        id,
        name
      )
    `)
    .eq(idColumn, itemId);

  if (error) throw error;
  return data || [];
}

export async function addTagToItem(tagId: string, itemId: string, isUserItem: boolean) {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  const payload = isUserItem 
    ? { tag_id: tagId, user_item_id: itemId } as UserItemTag
    : { tag_id: tagId, official_item_id: itemId } as OfficialItemTag;

  const { error } = await supabase
    .from(tableName)
    .insert(payload);

  if (error) throw error;
}

export async function removeTagFromItem(tagId: string, itemId: string, isUserItem: boolean) {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  const idColumn = isUserItem ? "user_item_id" : "official_item_id";

  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq("tag_id", tagId)
    .eq(idColumn, itemId);

  if (error) throw error;
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

export async function deleteRelatedRecords(
  table: TableName,
  itemId: string
): Promise<{ error: Error | null }> {
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
