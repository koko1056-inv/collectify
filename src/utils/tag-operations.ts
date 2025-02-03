import { supabase } from "@/integrations/supabase/client";
import { TableName } from "@/types/tag";
import { Tag } from "@/types";

export async function addTagToItem(itemId: string, tagId: string, isUserItem: boolean = true) {
  const table = isUserItem ? 'user_item_tags' : 'item_tags';
  
  const { error } = await supabase
    .from(table)
    .insert(isUserItem 
      ? { user_item_id: itemId, tag_id: tagId }
      : { official_item_id: itemId, tag_id: tagId }
    );

  if (error) throw error;
}

export async function removeTagFromItem(itemId: string, tagId: string, isUserItem: boolean = true) {
  const table = isUserItem ? 'user_item_tags' : 'item_tags';
  const itemColumn = isUserItem ? 'user_item_id' : 'official_item_id';

  const { error } = await supabase
    .from(table)
    .delete()
    .eq(itemColumn, itemId)
    .eq('tag_id', tagId);

  if (error) throw error;
}

export async function getTagsForItem(itemId: string, isUserItem: boolean = true): Promise<Tag[]> {
  const table = isUserItem ? 'user_item_tags' : 'item_tags';
  const itemColumn = isUserItem ? 'user_item_id' : 'official_item_id';

  const { data, error } = await supabase
    .from(table)
    .select(`
      tags (
        id,
        name,
        created_at,
        is_category
      )
    `)
    .eq(itemColumn, itemId);

  if (error) throw error;
  
  return (data?.map(item => item.tags).filter(Boolean) as Tag[]) || [];
}

export async function deleteRelatedRecords(tableName: TableName, itemId: string) {
  const columnName = tableName === "item_tags" ? "official_item_id" : "user_item_id";
  
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq(columnName, itemId);

  return { error };
}

export async function deleteUserItem(itemId: string) {
  const { error } = await supabase
    .from("user_items")
    .delete()
    .eq("id", itemId);

  return { error };
}