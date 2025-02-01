import { supabase } from "@/integrations/supabase/client";
import { TableName, ItemTagInsert, UserItemTagInsert, TagOperationResult } from "@/types/tag";

export const deleteRelatedRecords = async (tableName: TableName, itemId: string): Promise<TagOperationResult> => {
  const columnName = tableName === "item_tags" ? "official_item_id" : "user_item_id";
  
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq(columnName, itemId);

  return {
    error,
    operation: tableName
  };
};

export const deleteUserItem = async (itemId: string): Promise<TagOperationResult> => {
  const { error } = await supabase
    .from("user_items")
    .delete()
    .eq("id", itemId);

  return {
    error,
    operation: "user_items"
  };
};

export const addTagToItem = async (itemId: string, tagId: string, isUserItem: boolean = false) => {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  const columnName = isUserItem ? "user_item_id" : "official_item_id";

  const { data: existingTag, error: checkError } = await supabase
    .from(tableName)
    .select("id")
    .eq(columnName, itemId)
    .eq("tag_id", tagId)
    .maybeSingle();

  if (checkError) {
    return { error: checkError };
  }

  if (existingTag) {
    return { data: existingTag, error: null };
  }

  const insertData: ItemTagInsert | UserItemTagInsert = isUserItem 
    ? { user_item_id: itemId, tag_id: tagId }
    : { official_item_id: itemId, tag_id: tagId };

  const { data, error } = await supabase
    .from(tableName)
    .insert(insertData)
    .select()
    .single();

  return { data, error };
};