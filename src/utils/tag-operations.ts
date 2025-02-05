
import { supabase } from "@/integrations/supabase/client";

// Define the TableName type
type TableName = "user_item_likes" | "item_memories" | "user_item_tags";

// Define a simplified tag interface to prevent recursion
interface Tag {
  id: string;
  name: string;
  created_at: string;
  is_category?: boolean;
}

// Define the tag with details interface
interface TagWithDetails {
  id: string;
  tag_id: string;
  created_at: string;
  tags: Tag | null;
}

export async function getTagsForItem(
  itemId: string, 
  isUserItem: boolean = false
): Promise<TagWithDetails[]> {
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
        created_at,
        is_category
      )
    `)
    .eq(idColumn, itemId);

  if (error) throw error;
  return (data || []) as TagWithDetails[];
}

export async function addTagToItem(
  tagId: string,
  itemId: string,
  isUserItem: boolean = false
): Promise<void> {
  const table = isUserItem ? "user_item_tags" : "item_tags";
  const insertData = isUserItem 
    ? { tag_id: tagId, user_item_id: itemId }
    : { tag_id: tagId, official_item_id: itemId };

  const { error } = await supabase
    .from(table)
    .insert(insertData);

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
