
import { supabase } from "@/integrations/supabase/client";

export interface Tag {
  id: string;
  name: string;
}

export interface ItemTag {
  id: string;
  tag_id: string;
  created_at: string;
  tags?: {
    id: string;
    name: string;
  } | null;
}

export async function getTagsForItem(itemId: string, isUserItem: boolean) {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  const idColumn = isUserItem ? "user_item_id" : "official_item_id";

  const { data, error } = await supabase
    .from(tableName)
    .select('id, tag_id, created_at, tags:tags(id, name)')
    .eq(idColumn, itemId);

  if (error) throw error;
  return (data as ItemTag[]) || [];
}

export async function addTagToItem(
  tagId: string,
  itemId: string,
  isUserItem: boolean
) {
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  const payload = isUserItem 
    ? { user_item_id: itemId, tag_id: tagId }
    : { official_item_id: itemId, tag_id: tagId };

  const { error } = await supabase
    .from(tableName)
    .insert(payload);

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

export async function deleteUserItem(itemId: string): Promise<{ error: Error | null; officialItemId?: string }> {
  const { data: userItem } = await supabase
    .from('user_items')
    .select('official_item_id')
    .eq('id', itemId)
    .single();

  const { error } = await supabase
    .from('user_items')
    .delete()
    .eq('id', itemId);

  if (error) return { error: new Error(error.message) };
  return { error: null, officialItemId: userItem?.official_item_id };
}
