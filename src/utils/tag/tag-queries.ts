
import { supabase } from "@/integrations/supabase/client";
import { SimpleTag } from "./types";

// タグでグループ化されたアイテムを取得する関数
export async function getItemsGroupedByTag(userId: string) {
  try {
    const { data, error } = await supabase
      .from("user_item_tags")
      .select(`
        tag_id,
        tags:tag_id (
          id,
          name,
          category
        ),
        user_items:user_item_id (
          id,
          title,
          image,
          quantity
        )
      `)
      .eq("user_id", userId);

    if (error) throw error;

    // タグごとにアイテムをグループ化
    const groupedItems: Record<string, any> = {};

    data.forEach((item) => {
      if (!item.tags || !item.user_items) return;

      const tagName = item.tags.name;
      const tagId = item.tags.id;
      
      if (!groupedItems[tagId]) {
        groupedItems[tagId] = {
          tag: {
            id: tagId,
            name: tagName,
            category: item.tags.category,
          },
          items: [],
        };
      }

      // 既に追加されているかチェック
      const existingItemIndex = groupedItems[tagId].items.findIndex(
        (i: any) => i.id === item.user_items.id
      );

      if (existingItemIndex === -1) {
        groupedItems[tagId].items.push(item.user_items);
      }
    });

    return Object.values(groupedItems);
  } catch (error) {
    console.error("Error fetching items grouped by tag:", error);
    return [];
  }
}

// タグの一覧を取得する関数
export async function getAllTags(): Promise<SimpleTag[]> {
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("id, name, category, created_at")
      .order("name");

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching tags:", error);
    return [];
  }
}

// カテゴリーでタグをフィルタリングする関数
export async function getTagsByCategory(category: string): Promise<SimpleTag[]> {
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("id, name, category, created_at")
      .eq("category", category)
      .order("name");

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching tags by category:", error);
    return [];
  }
}
