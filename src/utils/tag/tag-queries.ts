
import { supabase } from "@/integrations/supabase/client";
import { SimpleItemTag } from "./types";

// アイテムのタグを取得する関数
export async function getTagsForItem(
  itemId: string | null,
  isUserItem: boolean = false
): Promise<SimpleItemTag[]> {
  if (!itemId) return [];

  try {
    // テーブル名を決定
    const tableName = isUserItem ? "user_item_tags" : "item_tags";
    const itemColumn = isUserItem ? "user_item_id" : "official_item_id";

    // タグを取得するクエリ
    const { data, error } = await supabase
      .from(tableName)
      .select(`
        tag_id,
        tags:tags (
          id,
          name,
          category,
          created_at
        )
      `)
      .eq(itemColumn, itemId);

    if (error) {
      console.error(`Error fetching tags for ${tableName}:`, error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // 結果を変換して返す
    return data.map(item => ({
      tag_id: item.tag_id,
      tags: item.tags
    }));
  } catch (error) {
    console.error(`Error in getTagsForItem for ${itemId}:`, error);
    return [];
  }
}

// アイテムがユーザーのコレクションに存在するかチェック
export const isItemInUserCollection = async (itemId: string, userId: string) => {
  const { data, error } = await supabase
    .from("user_items")
    .select("id")
    .eq("official_item_id", itemId)
    .eq("user_id", userId)
    .maybeSingle();
  
  if (error) {
    console.error("Error checking if item exists in collection:", error);
    return false;
  }
  
  return !!data;
};

// ユーザーコレクションのサイズを取得
export const getUserCollectionSize = async (userId: string) => {
  const { count, error } = await supabase
    .from("user_items")
    .select("id", { count: 'exact', head: true })
    .eq("user_id", userId);
  
  if (error) {
    console.error("Error getting user collection size:", error);
    return 0;
  }
  
  return count || 0;
};

// アイテムに対するユーザーのいいねをチェック
export const hasUserLikedItem = async (itemId: string, userId: string) => {
  const { data, error } = await supabase
    .from("user_item_likes")
    .select("id")
    .eq("user_item_id", itemId)
    .eq("user_id", userId)
    .maybeSingle();
  
  if (error) {
    console.error("Error checking if user liked item:", error);
    return false;
  }
  
  return !!data;
};

// カテゴリごとにタグを取得
export const getTagsByCategory = async (category: string) => {
  const { data, error } = await supabase
    .from("tags")
    .select("id, name")
    .eq("category", category)
    .order("name");
  
  if (error) {
    console.error(`Error fetching ${category} tags:`, error);
    return [];
  }
  
  return data || [];
};

// タグに基づいてアイテムを検索
export const searchItemsByTags = async (tagIds: string[]) => {
  if (!tagIds.length) return [];
  
  const { data, error } = await supabase
    .from("item_tags")
    .select(`
      official_item_id,
      official_items (*)
    `)
    .in("tag_id", tagIds);
  
  if (error) {
    console.error("Error searching items by tags:", error);
    return [];
  }
  
  // ユニークな公式アイテムIDのみを抽出
  const uniqueItems = Array.from(
    new Set(data.map(item => item.official_item_id))
  ).map(id => {
    return data.find(item => item.official_item_id === id)?.official_items;
  }).filter(Boolean);
  
  return uniqueItems;
};
