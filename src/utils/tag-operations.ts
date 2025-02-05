import { supabase } from "@/integrations/supabase/client";

export interface Tag {
  id: string;
  name: string;
  created_at?: string;
}

export interface ItemTag {
  id: string;
  tag_id: string;
  tags?: Tag;
}

export async function getTagsForItem(itemId: string, isUserItem: boolean): Promise<ItemTag[]> {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  const idColumn = isUserItem ? "user_item_id" : "official_item_id";

  const { data, error } = await supabase
    .from(tableName)
    .select(`
      *,
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
  const idColumn = isUserItem ? "user_item_id" : "official_item_id";

  const { error } = await supabase
    .from(tableName)
    .insert([
      {
        tag_id: tagId,
        [idColumn]: itemId
      }
    ]);

  if (error) throw error;
}

export async function removeTagFromItem(tagId: string, itemId: string, isUserItem: boolean) {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  const idColumn = isUserItem ? "user_item_id" : "official_item_id";

  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq("tag_id", tagId)
    .eq(idColumn, itemId);

  if (error) throw error;
}