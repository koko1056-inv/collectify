
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "@/types/tag";

// Define ItemTag interface here rather than importing it to avoid circular dependencies
interface ItemTag {
  id: string;
  tag_id: string;
  tags: {
    id: string;
    name: string;
    category?: string;
    created_at?: string;
  } | null;
}

/**
 * アイテムからタグを削除する
 */
export const removeTagFromItem = async (
  tagId: string,
  itemId: string,
  isUserItem: boolean = false
) => {
  const table = isUserItem ? "user_item_tags" : "item_tags";
  const idField = isUserItem ? "user_item_id" : "official_item_id";

  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("tag_id", tagId)
      .eq(idField, itemId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error removing tag:", error);
    throw error;
  }
};

/**
 * アイテムにタグを追加する
 */
export const addTagToItem = async (
  itemId: string,
  tagId: string,
  isUserItem: boolean = false
) => {
  const table = isUserItem ? "user_item_tags" : "item_tags";
  const idField = isUserItem ? "user_item_id" : "official_item_id";

  // 既に存在するかチェック
  const { data: existingTag, error: checkError } = await supabase
    .from(table)
    .select("*")
    .eq("tag_id", tagId)
    .eq(idField, itemId)
    .maybeSingle();

  if (checkError) throw checkError;

  // 既に存在する場合は追加しない
  if (existingTag) {
    return { success: true, exists: true };
  }

  // タグを追加
  if (isUserItem) {
    const { error } = await supabase
      .from("user_item_tags")
      .insert({
        tag_id: tagId,
        user_item_id: itemId,
      });
    
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("item_tags")
      .insert({
        tag_id: tagId,
        official_item_id: itemId,
      });
    
    if (error) throw error;
  }
  
  return { success: true, exists: false };
};

/**
 * ユーザーアイテムを削除する
 */
export const deleteUserItem = async (itemId: string) => {
  try {
    // Get the official_item_id before deleting
    const { data: userItem, error: fetchError } = await supabase
      .from("user_items")
      .select("official_item_id")
      .eq("id", itemId)
      .single();
    
    if (fetchError) throw fetchError;
    const officialItemId = userItem?.official_item_id;
    
    // Delete related tags
    const { error: tagsError } = await supabase
      .from("user_item_tags")
      .delete()
      .eq("user_item_id", itemId);
    
    if (tagsError) throw tagsError;
    
    // Delete related memories
    const { error: memoriesError } = await supabase
      .from("item_memories")
      .delete()
      .eq("user_item_id", itemId);
    
    if (memoriesError) throw memoriesError;
    
    // Delete the item itself
    const { error: deleteError } = await supabase
      .from("user_items")
      .delete()
      .eq("id", itemId);
    
    if (deleteError) throw deleteError;
    
    return { success: true, officialItemId };
  } catch (error) {
    console.error("Error deleting user item:", error);
    return { error, officialItemId: null };
  }
};

/**
 * アイテムに関連するタグを取得する
 */
export const getTagsForItem = async (
  itemId: string,
  isUserItem: boolean = false
): Promise<ItemTag[]> => {
  try {
    const table = isUserItem ? "user_item_tags" : "item_tags";
    const { data, error } = await supabase
      .from(table)
      .select(`
        id,
        tag_id,
        tags (
          id,
          name,
          category,
          created_at
        )
      `)
      .eq(isUserItem ? "user_item_id" : "official_item_id", itemId);

    if (error) throw error;

    // Transform the data to match the ItemTag interface
    return (data || []).map(item => ({
      id: item.id,
      tag_id: item.tag_id,
      tags: item.tags
    })) as ItemTag[];
  } catch (error) {
    console.error(`Error fetching tags for item ${itemId}:`, error);
    return [];
  }
};

/**
 * ランダムなユーザーアイテムを取得する
 */
export const getRandomUserItem = async (userId: string) => {
  try {
    // ユーザーのアイテム総数を取得
    const { count, error: countError } = await supabase
      .from("user_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    
    if (countError) throw countError;
    if (!count || count === 0) return null;
    
    // ランダムなインデックスを生成
    const randomIndex = Math.floor(Math.random() * count);
    
    // ランダムなアイテムを取得
    const { data, error } = await supabase
      .from("user_items")
      .select(`
        *,
        user_item_tags (
          tags (
            id,
            name
          )
        )
      `)
      .eq("user_id", userId)
      .range(randomIndex, randomIndex);
    
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("Error fetching random user item:", error);
    return null;
  }
};

/**
 * ID配列からタグを取得する
 */
export const getTagsByIds = async (tagIds: string[]): Promise<Tag[]> => {
  if (!tagIds.length) return [];
  
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .in("id", tagIds);
  
  if (error) throw error;
  return data || [];
};

/**
 * アイテムのコンテンツを設定する
 */
export const setItemContent = async (
  itemId: string, 
  contentName: string | null,
  isUserItem: boolean = false
) => {
  try {
    const table = isUserItem ? "user_items" : "official_items";
    
    const { error } = await supabase
      .from(table)
      .update({ content_name: contentName })
      .eq("id", itemId);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error(`Error setting content for item ${itemId}:`, error);
    throw error;
  }
};

/**
 * 利用可能なコンテンツ名の一覧を取得する
 */
export const getAllContentNames = async () => {
  try {
    const { data, error } = await supabase
      .from("content_names")
      .select("*")
      .order("name");
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching content names:", error);
    return [];
  }
};

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
