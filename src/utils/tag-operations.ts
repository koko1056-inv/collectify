
import { supabase } from "@/integrations/supabase/client";

interface UserItemTag {
  tag_id: string;
  user_item_id: string;
}

interface OfficialItemTag {
  tag_id: string;
  official_item_id: string;
}

interface DeleteUserItemResult {
  error: Error | null;
  officialItemId?: string;
}

export type ItemTag = {
  id: string;
  tag_id: string;
  tags: {
    id: string;
    name: string;
  } | null;
};

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

export async function deleteUserItem(itemId: string): Promise<DeleteUserItemResult> {
  try {
    // First, get the official_item_id before deleting
    const { data: userItem, error: fetchError } = await supabase
      .from("user_items")
      .select("official_item_id")
      .eq("id", itemId)
      .single();

    if (fetchError) throw fetchError;

    // Delete related records first
    const tables = ["user_item_likes", "item_memories", "user_item_tags"] as const;
    for (const table of tables) {
      const { error } = await deleteRelatedRecords(table, itemId);
      if (error) throw error;
    }

    // Delete the user item
    const { error: deleteError } = await supabase
      .from("user_items")
      .delete()
      .eq("id", itemId);

    if (deleteError) throw deleteError;

    // Return the official_item_id for query invalidation
    return { error: null, officialItemId: userItem?.official_item_id };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function deleteRelatedRecords(
  table: "user_item_likes" | "item_memories" | "user_item_tags",
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
