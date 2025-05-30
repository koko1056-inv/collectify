
import { supabase } from "@/integrations/supabase/client";

interface ItemsGroupedByTag {
  group_name: string;
  items: Array<{
    id: string;
    title: string;
    image: string;
    content_name?: string | null;
    quantity?: number;
    [key: string]: any;
  }>;
}

interface GroupedItem {
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
}

/**
 * タグでグループ化されたアイテムを取得する関数
 */
export async function getItemsGroupedByTag(userId: string, tagCategory?: string): Promise<ItemsGroupedByTag[]> {
  try {
    // ユーザーのアイテムとタグ情報を取得
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
      console.error("Error fetching items grouped by tag:", error);
      return [];
    }

    if (!data || data.length === 0) return [];

    // タグでグループ化
    const groupedByTag: Record<string, Array<GroupedItem>> = {};
    
    (data as GroupedItem[]).forEach(item => {
      item.user_item_tags.forEach(itemTag => {
        if (itemTag.tags) {
          const tagName = itemTag.tags.name;
          // カテゴリフィルターが指定されている場合はチェック
          if (tagCategory && itemTag.tags.category !== tagCategory) {
            return;
          }
          
          if (!groupedByTag[tagName]) {
            groupedByTag[tagName] = [];
          }
          
          // 重複チェック
          if (!groupedByTag[tagName].find(i => i.id === item.id)) {
            groupedByTag[tagName].push(item);
          }
        }
      });
    });

    // 結果をフォーマット
    return Object.entries(groupedByTag).map(([groupName, items]) => ({
      group_name: groupName,
      items: items.map(item => ({
        id: item.id,
        title: item.title,
        image: item.image,
        content_name: item.content_name,
        quantity: item.quantity
      }))
    }));
  } catch (error) {
    console.error("Error fetching items grouped by tag:", error);
    return [];
  }
}

/**
 * カスタムグループでグループ化されたアイテムを取得する関数
 */
export async function getItemsGroupedByCustomGroups(userId: string): Promise<ItemsGroupedByTag[]> {
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

    // コンテンツ名でグループ化 - 型を明示的に定義
    const groupedByContent: Record<string, Array<GroupedItem>> = {};
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
      items: items.map(item => ({
        id: item.id,
        title: item.title,
        image: item.image,
        content_name: item.content_name,
        quantity: item.quantity
      }))
    }));
  } catch (error) {
    console.error("Error grouping items by custom groups:", error);
    return [];
  }
}
