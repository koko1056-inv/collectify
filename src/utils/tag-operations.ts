import { supabase } from "@/integrations/supabase/client";

export interface TagData {
  id: string;
  name: string;
  category?: string;
}

export interface ItemTag {
  id: string;
  tag_id: string;
  tags: TagData | null;
}

export interface DeleteUserItemResult {
  error: Error | null;
  officialItemId?: string;
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
        name,
        category
      )
    `)
    .eq(idColumn, itemId);

  if (error) throw error;
  return data || [];
}

export async function updateTagsForItem(
  itemId: string,
  tagIds: string[],
  isUserItem: boolean
): Promise<void> {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  const idColumn = isUserItem ? "user_item_id" : "official_item_id";

  // まず既存のタグを削除
  const { error: deleteError } = await supabase
    .from(tableName)
    .delete()
    .eq(idColumn, itemId);

  if (deleteError) throw deleteError;

  // 新しいタグを追加
  if (tagIds.length > 0) {
    const newTags = tagIds.map(tagId => {
      if (isUserItem) {
        return {
          user_item_id: itemId,
          tag_id: tagId
        };
      } else {
        return {
          official_item_id: itemId,
          tag_id: tagId
        };
      }
    });

    const { error: insertError } = await supabase
      .from(tableName)
      .insert(newTags);

    if (insertError) throw insertError;
  }
}

export async function addTagToItem(
  tagId: string,
  itemId: string,
  isUserItem: boolean = false
): Promise<void> {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  
  const data = isUserItem 
    ? { user_item_id: itemId, tag_id: tagId }
    : { official_item_id: itemId, tag_id: tagId };

  const { error } = await supabase
    .from(tableName)
    .insert([data]); // 配列として渡す

  if (error) throw error;
}

export async function removeTagFromItem(
  tagId: string,
  itemId: string,
  isUserItem: boolean = false
): Promise<void> {
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
      .single();

    if (fetchError) throw fetchError;

    // Delete related records
    await Promise.all([
      supabase
        .from("trade_requests")
        .delete()
        .or(`requested_item_id.eq.${itemId},offered_item_id.eq.${itemId}`),
      supabase
        .from("user_item_likes")
        .delete()
        .eq("user_item_id", itemId),
      supabase
        .from("item_memories")
        .delete()
        .eq("user_item_id", itemId),
      supabase
        .from("user_item_tags")
        .delete()
        .eq("user_item_id", itemId)
    ]);

    const { error: deleteError } = await supabase
      .from("user_items")
      .delete()
      .eq("id", itemId);

    if (deleteError) throw deleteError;

    return { error: null, officialItemId: userItem?.official_item_id };
  } catch (error) {
    console.error("Error deleting user item:", error);
    return { error: error as Error };
  }
}
