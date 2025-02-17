
import { supabase } from "@/integrations/supabase/client";
import { TableName } from "@/types/tag";

export interface DeleteUserItemResult {
  error: Error | null;
  officialItemId?: string;
}

export async function getTagsForItem(itemId: string, isUserItem: boolean) {
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
    .eq(idColumn, itemId)
    .eq("tag_id", tagId);

  if (error) throw error;
}

async function deleteAllTradeRequests(itemId: string): Promise<void> {
  const { error } = await supabase
    .from("trade_requests")
    .delete()
    .or(`requested_item_id.eq.${itemId},offered_item_id.eq.${itemId}`);

  if (error) throw error;
}

async function deleteRelatedRecords(tableName: TableName, itemId: string): Promise<void> {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq("user_item_id", itemId);

  if (error) throw error;
}

export async function deleteUserItem(itemId: string): Promise<DeleteUserItemResult> {
  try {
    // ユーザーアイテムの情報を取得
    const { data: userItem, error: fetchError } = await supabase
      .from("user_items")
      .select("official_item_id")
      .eq("id", itemId)
      .single();

    if (fetchError) throw fetchError;

    // 関連するレコードを削除
    await deleteAllTradeRequests(itemId);
    await Promise.all([
      deleteRelatedRecords("user_item_likes", itemId),
      deleteRelatedRecords("item_memories", itemId),
      deleteRelatedRecords("user_item_tags", itemId)
    ]);

    // ユーザーアイテムを削除
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
