
import { supabase } from "@/integrations/supabase/client";

export interface Tag {
  id: string;
  name: string;
}

export interface ItemTag {
  id: string;
  tag_id: string;
  created_at: string;
  tags: Tag | null;
}

export async function getTagsForItem(itemId: string, isUserItem: boolean) {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  const idColumn = isUserItem ? "user_item_id" : "official_item_id";

  const { data, error } = await supabase
    .from(tableName)
    .select('id, tag_id, created_at, tags(id, name)')
    .eq(idColumn, itemId);

  if (error) throw error;
  return (data as ItemTag[]) || [];
}

export async function addTagToItem(
  itemId: string,
  tagId: string,
  isUserItem: boolean
) {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  const idColumn = isUserItem ? "user_item_id" : "official_item_id";

  const { error } = await supabase.from(tableName).insert({
    [idColumn]: itemId,
    tag_id: tagId,
  });

  if (error) throw error;
}

export async function removeTagFromItem(
  itemTagId: string,
  isUserItem: boolean
) {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";

  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', itemTagId);

  if (error) throw error;
}

export async function getAllTags() {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name');

  if (error) throw error;
  return data as Tag[];
}
