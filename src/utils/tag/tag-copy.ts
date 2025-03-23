
import { supabase } from "@/integrations/supabase/client";

/**
 * 公式アイテムからタグを取得してユーザーアイテムにコピーする
 */
export const copyTagsFromOfficialItem = async (
  officialItemId: string,
  userItemId: string
) => {
  try {
    // 公式アイテムのタグを取得
    const { data: officialTags, error: getError } = await supabase
      .from("item_tags")
      .select(`
        tag_id
      `)
      .eq("official_item_id", officialItemId);
    
    if (getError) throw getError;
    if (!officialTags || officialTags.length === 0) return { success: true, count: 0 };

    // 既存のユーザーアイテムタグを取得
    const { data: existingTags, error: existingError } = await supabase
      .from("user_item_tags")
      .select("tag_id")
      .eq("user_item_id", userItemId);
    
    if (existingError) throw existingError;
    
    // 既存のタグIDのセットを作成
    const existingTagIds = new Set((existingTags || []).map(tag => tag.tag_id));
    
    // 追加するタグを準備
    const tagsToAdd = officialTags
      .filter(tag => !existingTagIds.has(tag.tag_id))
      .map(tag => ({
        user_item_id: userItemId,
        tag_id: tag.tag_id
      }));
    
    if (tagsToAdd.length === 0) return { success: true, count: 0 };
    
    // 新しいタグを追加
    const { error: insertError } = await supabase
      .from("user_item_tags")
      .insert(tagsToAdd);
    
    if (insertError) throw insertError;
    
    return { success: true, count: tagsToAdd.length };
  } catch (error) {
    console.error("Error copying tags:", error);
    return { success: false, error };
  }
};
