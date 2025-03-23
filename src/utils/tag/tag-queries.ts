
import { supabase } from "@/integrations/supabase/client";
import { SimpleItemTag } from "./types";

/**
 * アイテムのタグを取得する
 */
export const getTagsForItem = async (
  itemId: string,
  isUserItem: boolean = false
): Promise<SimpleItemTag[]> => {
  try {
    const table = isUserItem ? "user_item_tags" : "item_tags";
    const idField = isUserItem ? "user_item_id" : "official_item_id";

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
      .eq(idField, itemId);
    
    if (error) throw error;
    
    // SimpleItemTag形式に変換して返す
    return (data || []).map(item => ({
      id: item.id,
      tag_id: item.tag_id,
      tags: item.tags
    })) as SimpleItemTag[];
  } catch (error) {
    console.error("Error fetching tags for item:", error);
    return [];
  }
};

/**
 * タグごとにグループ化されたアイテムを取得する
 */
export const getItemsGroupedByTag = async (
  userId: string,
  isUserItem: boolean = true
) => {
  try {
    // ユーザーのアイテムとそのタグを取得
    const table = isUserItem ? "user_items" : "official_items";
    const tagsTable = isUserItem ? "user_item_tags" : "item_tags";
    const idField = isUserItem ? "user_id" : "created_by";

    // まずユーザーのアイテムを全て取得
    const { data: items, error: itemsError } = await supabase
      .from(table)
      .select("*")
      .eq(idField, userId);

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) return {};

    // 各アイテムのタグを取得
    const itemsByTagMap: Record<string, any[]> = {};
    const noTagItems: any[] = [];

    // 各アイテムのタグを並行して取得
    const itemTagPromises = items.map(async (item) => {
      const itemIdField = isUserItem ? "user_item_id" : "official_item_id";
      const { data: tagData } = await supabase
        .from(tagsTable)
        .select(`
          tags (
            id,
            name,
            category
          )
        `)
        .eq(itemIdField, item.id);

      // タグがないアイテムは別に保存
      if (!tagData || tagData.length === 0) {
        noTagItems.push(item);
        return;
      }

      // 各タグごとにアイテムをグループ化
      tagData.forEach((tagItem) => {
        if (tagItem.tags) {
          const tagName = tagItem.tags.name;
          if (!itemsByTagMap[tagName]) {
            itemsByTagMap[tagName] = [];
          }
          // 同じアイテムが重複して追加されないようにチェック
          if (!itemsByTagMap[tagName].some(existingItem => existingItem.id === item.id)) {
            itemsByTagMap[tagName].push(item);
          }
        }
      });
    });

    // 全てのプロミスが完了するのを待つ
    await Promise.all(itemTagPromises);

    // タグなしのアイテムがある場合は「その他」カテゴリに入れる
    if (noTagItems.length > 0) {
      itemsByTagMap["その他"] = noTagItems;
    }

    return itemsByTagMap;
  } catch (error) {
    console.error("Error grouping items by tag:", error);
    return {};
  }
};
