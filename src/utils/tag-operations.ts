import { supabase } from "@/integrations/supabase/client";
import { TableName } from "@/types/tag";

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

interface TagWithName {
  id: string;
  name: string;
}

export async function getTagsForItem(itemId: string, isUserItem: boolean = true): Promise<TagWithName[]> {
  const table = isUserItem ? 'user_item_tags' : 'item_tags';
  const itemColumn = isUserItem ? 'user_item_id' : 'official_item_id';

  const { data, error } = await supabase
    .from(table)
    .select(`
      tags (
        id,
        name
      )
    `)
    .eq(itemColumn, itemId);

  if (error) throw error;
  return data?.map(item => item.tags).filter((tag): tag is TagWithName => tag !== null) || [];
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