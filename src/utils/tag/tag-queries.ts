
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "@/types/tag";
import { SimpleItemTag } from "@/utils/tag/types";

export async function fetchOfficialItemTags(itemId: string): Promise<SimpleItemTag[]> {
  const { data, error } = await supabase
    .from("item_tags")
    .select(`
      tag_id,
      tags (
        id,
        name,
        category
      )
    `)
    .eq("official_item_id", itemId);

  if (error) throw error;

  // タグのマッピングを簡略化
  return data.map((itemTag: any) => ({
    tag_id: itemTag.tag_id,
    tags: itemTag.tags ? {
      id: itemTag.tags.id,
      name: itemTag.tags.name,
      category: itemTag.tags.category
    } : null
  })) as SimpleItemTag[];
}

export async function isItemInUserCollection(itemId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_items")
    .select("id")
    .eq("official_item_id", itemId)
    .eq("user_id", userId)
    .single();

  if (error) return false;
  return !!data;
}
