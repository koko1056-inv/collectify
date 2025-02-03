import { supabase } from "@/integrations/supabase/client";
import { Tag } from "@/types";

interface TagOperationResult {
  success: boolean;
  error?: string;
}

export async function addTagToItem(
  itemId: string,
  tagId: string,
  isUserItem: boolean = true
): Promise<TagOperationResult> {
  const table = isUserItem ? 'user_item_tags' : 'item_tags';
  const itemColumn = isUserItem ? 'user_item_id' : 'official_item_id';

  const { error } = await supabase
    .from(table)
    .insert([
      {
        [itemColumn]: itemId,
        tag_id: tagId,
      },
    ]);

  if (error) {
    console.error('Error adding tag:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getTagsForItem(itemId: string, isUserItem: boolean = true): Promise<Tag[]> {
  const table = isUserItem ? 'user_item_tags' : 'item_tags';
  const itemColumn = isUserItem ? 'user_item_id' : 'official_item_id';

  const { data, error } = await supabase
    .from(table)
    .select(`
      tag_id,
      tags (
        id,
        name
      )
    `)
    .eq(itemColumn, itemId);

  if (error) {
    console.error('Error fetching tags:', error);
    return [];
  }

  return data.map(item => item.tags).filter(Boolean);
}

export async function removeTagFromItem(
  itemId: string,
  tagId: string,
  isUserItem: boolean = true
): Promise<TagOperationResult> {
  const table = isUserItem ? 'user_item_tags' : 'item_tags';
  const itemColumn = isUserItem ? 'user_item_id' : 'official_item_id';

  const { error } = await supabase
    .from(table)
    .delete()
    .eq(itemColumn, itemId)
    .eq('tag_id', tagId);

  if (error) {
    console.error('Error removing tag:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}