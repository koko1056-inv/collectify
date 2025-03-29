
import { supabase } from "@/integrations/supabase/client";
import { TaggedItemGroups, UserItem, TagQueryItem } from "./types";

// タグでグループ化されたアイテムを取得する関数
export async function getItemsGroupedByTag(userId: string): Promise<TaggedItemGroups> {
  try {
    // ユーザーのアイテムを取得
    const { data: userItems, error: itemsError } = await supabase
      .from("user_items")
      .select(`
        id,
        title,
        image,
        quantity,
        user_id,
        official_item_id,
        created_at,
        updated_at,
        user_item_tags (
          tag_id,
          tags (
            id,
            name,
            category
          )
        )
      `)
      .eq("user_id", userId);

    if (itemsError) {
      console.error("Error fetching user items:", itemsError);
      return {};
    }

    // アイテムをタグごとにグループ化
    const groupedItems: TaggedItemGroups = {};

    userItems?.forEach(item => {
      const userItem = item as unknown as TagQueryItem;
      
      // UserItemに変換する
      const convertedItem: UserItem = {
        id: userItem.id,
        title: userItem.title,
        image: userItem.image,
        user_id: userItem.user_id || userId, // user_idが欠けている場合は現在のユーザーIDを使用
        official_item_id: userItem.official_item_id,
        created_at: userItem.created_at,
        updated_at: userItem.updated_at,
        quantity: userItem.quantity
      };
      
      if (!userItem.user_item_tags || userItem.user_item_tags.length === 0) {
        // タグがないアイテムは「未分類」に入れる
        if (!groupedItems["未分類"]) {
          groupedItems["未分類"] = [];
        }
        groupedItems["未分類"].push(convertedItem);
        return;
      }

      userItem.user_item_tags.forEach((tagRelation) => {
        if (tagRelation.tags) {
          const tagName = tagRelation.tags.name;
          if (!groupedItems[tagName]) {
            groupedItems[tagName] = [];
          }
          
          // 同じアイテムが重複して追加されないよう確認
          const existingItem = groupedItems[tagName].find(existingItem => existingItem.id === userItem.id);
          if (!existingItem) {
            groupedItems[tagName].push(convertedItem);
          }
        }
      });
    });

    return groupedItems;
  } catch (error) {
    console.error("Error in getItemsGroupedByTag:", error);
    return {};
  }
}
