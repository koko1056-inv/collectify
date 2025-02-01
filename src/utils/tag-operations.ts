import { supabase } from "@/integrations/supabase/client";
import { TableName } from "@/types/tag";

export const deleteRelatedRecords = async (tableName: TableName, itemId: string) => {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq("user_item_id", itemId);

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
    operation: "user_items" as const
  };
};