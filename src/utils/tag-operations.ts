import { supabase } from "@/integrations/supabase/client";

export const deleteRelatedRecords = async (tableName: string, itemId: string) => {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq("user_item_id", itemId);

  return {
    error,
    operation: tableName as const
  };
};

export const deleteItem = async (itemId: string) => {
  const { error } = await supabase
    .from("user_items")
    .delete()
    .eq("id", itemId);

  return {
    error,
    operation: "user_items" as const
  };
};

export const addTagToItem = async (itemId: string, tagId: string, isUserItem: boolean = false) => {
  // First check if the relation already exists
  const { data: existingTag, error: checkError } = await supabase
    .from(isUserItem ? "user_item_tags" : "item_tags")
    .select("id")
    .eq(isUserItem ? "user_item_id" : "official_item_id", itemId)
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
  const { data, error } = await supabase
    .from(isUserItem ? "user_item_tags" : "item_tags")
    .insert([{
      [isUserItem ? "user_item_id" : "official_item_id"]: itemId,
      tag_id: tagId
    }])
    .select()
    .single();

  return { data, error };
};