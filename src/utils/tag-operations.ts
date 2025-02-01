import { supabase } from "@/integrations/supabase/client";
import { TableName, ItemTagInsert, UserItemTagInsert } from "@/types/tag";

export const deleteRelatedRecords = async (tableName: TableName, itemId: string) => {
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

export const deleteItem = async (itemId: string) => {
  const { error } = await supabase
    .from("user_items")
    .delete()
    .eq("id", itemId);

  return {
    error,
    operation: "user_items" as TableName
  };
};

export const addTagToItem = async (itemId: string, tagId: string, isUserItem: boolean = false) => {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  const columnName = isUserItem ? "user_item_id" : "official_item_id";

  // First check if the relation already exists
  const { data: existingTag, error: checkError } = await supabase
    .from(tableName)
    .select("id")
    .eq(columnName, itemId)
    .eq("tag_id", tagId)
    .maybeSingle();

  if (checkError) {
    return { error: checkError };
  }

  // If the relation already exists, return early
  if (existingTag) {
    return { data: existingTag, error: null };
  }

  // If no existing relation, create a new one
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