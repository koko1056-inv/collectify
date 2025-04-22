
import { SimpleItemTag, TagGroupedItems } from "./types";
import { getTagsForItem } from "./tag-queries";
import { supabase } from "@/integrations/supabase/client";

// ユーザーアイテムをタグごとにグループ化する関数
export const getItemsGroupedByTag = async (
  userId: string,
  includeUserItems: boolean = true
): Promise<TagGroupedItems> => {
  const groupedItems: TagGroupedItems = {};

  try {
    // ユーザーのアイテムを取得
    const { data: userItems, error } = await supabase
      .from("user_items")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user items:", error);
      return {};
    }

    if (!userItems || userItems.length === 0) {
      return {};
    }

    for (const item of userItems) {
      const tags: SimpleItemTag[] = await getTagsForItem(item.id, true);

      if (tags && tags.length > 0) {
        for (const tag of tags) {
          if (tag.tags) {
            const tagName = tag.tags.name;
            if (groupedItems[tagName]) {
              groupedItems[tagName].push(item);
            } else {
              groupedItems[tagName] = [item];
            }
          }
        }
      }
    }

    return groupedItems;
  } catch (error) {
    console.error("Error in getItemsGroupedByTag:", error);
    return {};
  }
};

// カスタムグループでアイテムをグループ化する関数
export const getItemsGroupedByCustomGroups = async (
  userId: string
): Promise<TagGroupedItems> => {
  // 実際の実装では、カスタムグループのデータをDBから取得する
  // 今はタグ別グルーピングと同じ結果を返すだけの簡易実装
  return getItemsGroupedByTag(userId, true);
};
