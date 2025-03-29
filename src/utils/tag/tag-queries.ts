
import { supabase } from "@/integrations/supabase/client";
import { SimpleItemTag } from "./types";

// 公式アイテムのタグを取得する
export const fetchOfficialItemTags = async (itemId: string): Promise<SimpleItemTag[]> => {
  try {
    if (!itemId) return [];

    const { data, error } = await supabase
      .from("item_tags")
      .select(`
        tag_id,
        tags (
          id,
          name,
          category,
          created_at
        )
      `)
      .eq("official_item_id", itemId);

    if (error) {
      console.error("Error fetching item tags:", error);
      throw error;
    }

    // nullのタグを適切に処理する
    return data.map((item) => ({
      tag_id: item.tag_id,
      tags: item.tags ? {
        id: item.tags.id,
        name: item.tags.name,
        category: item.tags.category,
        created_at: item.tags.created_at
      } : null
    }));
  } catch (error) {
    console.error("Error in fetchOfficialItemTags:", error);
    return [];
  }
};

// ユーザーアイテムのタグを取得する
export const fetchUserItemTags = async (itemId: string): Promise<SimpleItemTag[]> => {
  try {
    if (!itemId) return [];

    const { data, error } = await supabase
      .from("user_item_tags")
      .select(`
        tag_id,
        tags (
          id,
          name,
          category,
          created_at
        )
      `)
      .eq("user_item_id", itemId);

    if (error) {
      console.error("Error fetching user item tags:", error);
      throw error;
    }

    // nullのタグを適切に処理する
    return data.map((item) => ({
      tag_id: item.tag_id,
      tags: item.tags ? {
        id: item.tags.id,
        name: item.tags.name,
        category: item.tags.category,
        created_at: item.tags.created_at
      } : null
    }));
  } catch (error) {
    console.error("Error in fetchUserItemTags:", error);
    return [];
  }
};

// 複数アイテムのタグを一度に取得する
export const fetchMultipleItemsTags = async (
  itemIds: string[],
  isUserItem = false
): Promise<Record<string, SimpleItemTag[]>> => {
  try {
    if (!itemIds || itemIds.length === 0) return {};

    const table = isUserItem ? "user_item_tags" : "item_tags";
    const itemColumn = isUserItem ? "user_item_id" : "official_item_id";

    const { data, error } = await supabase
      .from(table)
      .select(`
        ${itemColumn},
        tag_id,
        tags (
          id,
          name,
          category,
          created_at
        )
      `)
      .in(itemColumn, itemIds);

    if (error) {
      console.error(`Error fetching multiple ${table}:`, error);
      throw error;
    }

    // 結果をアイテムIDごとにグループ化
    const result: Record<string, SimpleItemTag[]> = {};
    itemIds.forEach(id => {
      result[id] = [];
    });

    data.forEach(item => {
      const itemId = item[itemColumn];
      if (!result[itemId]) {
        result[itemId] = [];
      }

      // nullのタグを適切に処理する
      result[itemId].push({
        tag_id: item.tag_id,
        tags: item.tags ? {
          id: item.tags.id,
          name: item.tags.name,
          category: item.tags.category,
          created_at: item.tags.created_at
        } : null
      });
    });

    return result;
  } catch (error) {
    console.error("Error in fetchMultipleItemsTags:", error);
    return {};
  }
};
