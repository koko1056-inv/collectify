import { supabase } from "@/integrations/supabase/client";
import { ItemTag, Tag } from "@/types/tag";

export async function addTagToItem(itemId: string, tagId: string, isUserItem: boolean = true) {
  const table = isUserItem ? 'user_item_tags' : 'item_tags';
  const itemColumn = isUserItem ? 'user_item_id' : 'official_item_id';

  const { error } = await supabase
    .from(table)
    .insert({
      [itemColumn]: itemId,
      tag_id: tagId,
    });

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

export async function getItemTags(itemId: string, isUserItem: boolean = true): Promise<ItemTag[]> {
  const table = isUserItem ? 'user_item_tags' : 'item_tags';
  const itemColumn = isUserItem ? 'user_item_id' : 'official_item_id';

  const { data, error } = await supabase
    .from(table)
    .select(`
      tag_id,
      tags (
        id,
        name,
        created_at,
        is_category
      )
    `)
    .eq(itemColumn, itemId);

  if (error) throw error;
  return data || [];
}