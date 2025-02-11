
import { supabase } from "@/integrations/supabase/client";
import { TableName } from "@/types/tag";

interface DeleteUserItemResult {
  error: Error | null;
  officialItemId?: string;
}

interface Tag {
  id: string;
  name: string;
}

interface TagRelation {
  id: string;
  tag_id: string;
  tags: Tag | null;
}

export async function getTagsForItem(itemId: string, isUserItem: boolean): Promise<TagRelation[]> {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  const idColumn = isUserItem ? "user_item_id" : "official_item_id";

  const { data, error } = await supabase
    .from(tableName)
    .select(`
      id,
      tag_id,
      tags:tags (
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
    ? { tag_id: tagId, user_item_id: itemId }
    : { tag_id: tagId, official_item_id: itemId };

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

export async function deleteUserItem(itemId: string): Promise<DeleteUserItemResult> {
  try {
    const { data: userItem, error: fetchError } = await supabase
      .from("user_items")
      .select("official_item_id")
      .eq("id", itemId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const tables: TableName[] = ["user_item_likes", "item_memories", "user_item_tags"];
    for (const table of tables) {
      const { error } = await deleteRelatedRecords(table, itemId);
      if (error) throw error;
    }

    const { error: deleteError } = await supabase
      .from("user_items")
      .delete()
      .eq("id", itemId);

    if (deleteError) throw deleteError;

    return { error: null, officialItemId: userItem?.official_item_id };
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
