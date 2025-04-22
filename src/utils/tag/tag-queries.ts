
import { supabase } from "@/integrations/supabase/client";
import { SimpleItemTag, Tag, ItemsGroupedByTag } from "./types";

export async function getTagsForItem(itemId: string, isUserItem: boolean = false): Promise<SimpleItemTag[]> {
  const table = isUserItem ? "user_item_tags" : "item_tags";
  const itemIdField = isUserItem ? "user_item_id" : "official_item_id";

  try {
    const { data, error } = await supabase
      .from(table)
      .select(`
        id,
        tag_id,
        tags:tag_id (
          id,
          name,
          category,
          created_at
        )
      `)
      .eq(itemIdField, itemId);

    if (error) throw error;
    
    // Ensure each item has the required fields
    return (data || []).map(item => ({
      id: item.id,
      tag_id: item.tag_id,
      tags: item.tags
    }));
  } catch (error) {
    console.error("Error fetching tags for item:", error);
    return [];
  }
}

/**
 * アイテムがユーザーのコレクションに存在するか確認する関数
 */
export async function isItemInUserCollection(
  itemId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("user_items")
      .select("id")
      .eq("official_item_id", itemId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error checking item in user collection:", error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("Error checking item in user collection:", error);
    return false;
  }
}

/**
 * タグ名からタグIDを検索する関数
 */
export async function findTagIdByName(tagName: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('id')
      .eq('name', tagName)
      .single();

    if (error) {
      console.error('Error finding tag ID by name:', error);
      return null;
    }

    return data ? data.id : null;
  } catch (error) {
    console.error('Error finding tag ID by name:', error);
    return null;
  }
}

/**
 * 与えられたオブジェクトがSimpleTag型かどうかを判定するType Guard
 * @param obj 判定するオブジェクト
 * @returns objがSimpleTag型であればtrue、そうでなければfalse
 */
export function isSimpleTag(obj: any): obj is Tag {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string'
  );
}

/**
 * タグでグループ化されたアイテムを取得する関数
 * @param userId ユーザーID
 * @returns タグでグループ化されたアイテムの配列
 */
export async function getItemsGroupedByTag(userId: string, tagCategory?: string): Promise<ItemsGroupedByTag[]> {
  try {
    // タグでグループ化するストアドプロシージャを呼び出す
    const { data, error } = await supabase.rpc('get_items_grouped_by_tag', {
      param_user_id: userId
    });

    if (error) {
      console.error("Error fetching items grouped by tag:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching items grouped by tag:", error);
    return [];
  }
}

/**
 * カスタムグループでグループ化されたアイテムを取得する関数
 * @param userId ユーザーID
 * @returns カスタムグループでグループ化されたアイテムの配列
 */
export async function getItemsGroupedByCustomGroups(userId: string): Promise<ItemsGroupedByTag[]> {
  type GroupedItem = {
    id: string;
    title: string;
    image: string;
    content_name: string | null;
    quantity: number;
    user_item_tags: {
      tags: {
        id: string;
        name: string;
        category: string | null;
      } | null;
    }[];
  };

  try {
    // ユーザーのコレクションを取得
    const { data, error } = await supabase
      .from("user_items")
      .select(`
        id,
        title,
        image,
        content_name,
        quantity,
        user_item_tags (
          tags (
            id,
            name,
            category
          )
        )
      `)
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user items for grouping:", error);
      return [];
    }

    // コンテンツ名でグループ化
    const groupedByContent: Record<string, GroupedItem[]> = {};
    (data as GroupedItem[] || []).forEach(item => {
      const contentKey = item.content_name || "Other";
      if (!groupedByContent[contentKey]) {
        groupedByContent[contentKey] = [];
      }
      groupedByContent[contentKey].push(item);
    });

    // 結果をフォーマット
    return Object.entries(groupedByContent).map(([groupName, items]) => ({
      group_name: groupName,
      items: items
    }));
  } catch (error) {
    console.error("Error grouping items by custom groups:", error);
    return [];
  }
}
