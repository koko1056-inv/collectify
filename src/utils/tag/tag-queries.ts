
import { supabase } from "@/integrations/supabase/client";
import { SimpleItemTag, SimpleTag } from "./types";

// タグの取得関連機能

/**
 * 公式アイテムに付けられたタグを取得
 */
export const fetchOfficialItemTags = async (itemId: string) => {
  try {
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
    return data || [];
  } catch (error) {
    console.error("Error fetching official item tags:", error);
    return [];
  }
};

/**
 * ユーザーアイテムに付けられたタグを取得
 */
export const fetchUserItemTags = async (itemId: string) => {
  try {
    const { data, error } = await supabase
      .from("user_item_tags")
      .select(`
        tag_id,
        tags (
          id,
          name,
          category
        )
      `)
      .eq("user_item_id", itemId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching user item tags:", error);
    return [];
  }
};

/**
 * 複数のアイテムのタグを一度に取得
 */
export const fetchMultipleItemsTags = async (itemIds: string[], isUserItem: boolean = true) => {
  try {
    const tableName = isUserItem ? "user_item_tags" : "item_tags";
    const itemIdColumn = isUserItem ? "user_item_id" : "official_item_id";

    const { data, error } = await supabase
      .from(tableName)
      .select(`
        ${itemIdColumn},
        tag_id,
        tags (
          id,
          name,
          category
        )
      `)
      .in(itemIdColumn, itemIds);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error fetching tags for multiple ${isUserItem ? 'user' : 'official'} items:`, error);
    return [];
  }
};

/**
 * アイテムのタグを取得（ユーザーアイテムか公式アイテムかを自動判定）
 */
export const getTagsForItem = async (itemId: string, isUserItem: boolean = true): Promise<SimpleItemTag[]> => {
  try {
    // 適切なテーブルとカラム名を設定
    const tableName = isUserItem ? "user_item_tags" : "item_tags";
    const idColumnName = isUserItem ? "user_item_id" : "official_item_id";
    
    // データを取得
    const { data, error } = await supabase
      .from(tableName)
      .select(`
        tag_id,
        tags (
          id,
          name,
          category
        )
      `)
      .eq(idColumnName, itemId);
    
    if (error) throw error;
    
    // 結果をSimpleItemTag形式に変換して返す
    return (data || []).map(item => ({
      tag_id: item.tag_id,
      tags: item.tags
    }));
  } catch (error) {
    console.error("Error in getTagsForItem:", error);
    return [];
  }
};

/**
 * アイテムがユーザーのコレクションに存在するか確認
 */
export const isItemInUserCollection = async (officialItemId: string, userId: string): Promise<boolean> => {
  try {
    const { count, error } = await supabase
      .from("user_items")
      .select("*", { count: 'exact', head: true })
      .eq("official_item_id", officialItemId)
      .eq("user_id", userId);
    
    if (error) throw error;
    return count !== null && count > 0;
  } catch (error) {
    console.error("Error checking if item is in collection:", error);
    return false;
  }
};
