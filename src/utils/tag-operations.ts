
import { supabase } from "@/integrations/supabase/client";

// 明確な型定義
export interface Tag {
  id: string;
  name: string;
  category?: string;
  created_at: string;
}

export interface BaseItemTag {
  id: string;
  tag_id: string;
}

export interface ItemTagWithTag {
  id: string;
  tag_id: string;
  tags: Tag;
}

export interface DeleteUserItemResult {
  error: Error | null;
  officialItemId?: string;
}

export async function getTagsForItem(itemId: string, isUserItem: boolean): Promise<ItemTagWithTag[]> {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  const idColumn = isUserItem ? "user_item_id" : "official_item_id";

  try {
    const { data, error } = await supabase
      .from(tableName)
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
      .eq(idColumn, itemId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching tags:", error);
    return [];
  }
}

export async function checkTagExists(
  itemId: string, 
  tagId: string, 
  isUserItem: boolean = false
): Promise<boolean> {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  const idColumn = isUserItem ? "user_item_id" : "official_item_id";
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .eq(idColumn, itemId)
      .eq("tag_id", tagId)
      .maybeSingle();
    
    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error("Error checking tag existence:", error);
    return false;
  }
}

export async function addTagToItem(
  itemId: string,
  tagId: string,
  isUserItem: boolean = false
): Promise<void> {
  // 既に存在するかチェック
  const exists = await checkTagExists(itemId, tagId, isUserItem);
  if (exists) {
    console.log(`Tag (${tagId}) already exists for item (${itemId}), skipping insertion`);
    return;
  }

  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  const idColumn = isUserItem ? "user_item_id" : "official_item_id";
  
  const insertData = isUserItem 
    ? { user_item_id: itemId, tag_id: tagId }
    : { official_item_id: itemId, tag_id: tagId };

  try {
    const { error } = await supabase
      .from(tableName)
      .insert([insertData]);

    if (error) throw error;
    console.log(`Successfully added tag (${tagId}) to item (${itemId})`);
  } catch (error) {
    console.error("Error adding tag to item:", error);
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
