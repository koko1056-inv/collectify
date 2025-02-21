
import { supabase } from "@/integrations/supabase/client";
import type { Tag } from "@/types/tag";

export type { Tag };

export interface ItemTag {
  id: string;
  tag_id: string;
  tag: Tag;
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
      tag:tags (
        id,
        name,
        category,
        created_at
      )
    `)
    .eq(idColumn, itemId);

  if (error) throw error;
  return data || [];
}

export async function addTagToItem(
  itemId: string,
  tagId: string,
  isUserItem: boolean = false
): Promise<void> {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  
  const insertData = isUserItem 
    ? { user_item_id: itemId, tag_id: tagId }
    : { official_item_id: itemId, tag_id: tagId };

  const { error } = await supabase
    .from(tableName)
    .insert(insertData)
    .select()
    .single();

  // 重複キー制約エラーの場合は無視する（既に存在するため成功とみなす）
  if (error && error.code !== '23505') {
    throw error;
  }
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
