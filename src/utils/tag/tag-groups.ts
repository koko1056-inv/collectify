import { supabase } from "@/integrations/supabase/client";
import { SimpleTag } from "./types";

// 定義：タグでグループ化されたアイテム型
export interface TagGroupedItems {
  [tagName: string]: any[];
}

// タグでグループ化されたアイテムを取得する関数
export async function getItemsGroupedByTag(
  userId: string, 
  tagCategory: string
): Promise<TagGroupedItems> {
  try {
    // ユーザーの全アイテムを取得
    const { data: userItems, error: itemsError } = await supabase
      .from("user_items")
      .select("id, title, image, quantity")
      .eq("user_id", userId);

    if (itemsError) throw itemsError;
    if (!userItems || userItems.length === 0) return {};

    // ユーザーアイテムIDs
    const userItemIds = userItems.map(item => item.id);

    // カテゴリでフィルタリングされたタグを取得
    const { data: tags, error: tagsError } = await supabase
      .from("tags")
      .select("id, name")
      .eq("category", tagCategory);

    if (tagsError) throw tagsError;
    if (!tags || tags.length === 0) return {};

    // 各タグに関連するアイテムを収集
    const groupedItems: TagGroupedItems = {};

    // タグIDとタグ名のマッピングを作成
    const tagMap: Record<string, string> = {};
    tags.forEach(tag => {
      tagMap[tag.id] = tag.name;
      groupedItems[tag.name] = [];
    });

    // ユーザーアイテムタグを取得
    const { data: itemTags, error: itemTagsError } = await supabase
      .from("user_item_tags")
      .select(`
        tag_id,
        user_item_id,
        tags:tag_id (
          id,
          name,
          category
        )
      `)
      .in("user_item_id", userItemIds);

    if (itemTagsError) throw itemTagsError;
    if (!itemTags || itemTags.length === 0) return {};

    // タグに基づいてアイテムをグループ化
    for (const itemTag of itemTags) {
      // カテゴリが一致するタグのみ処理
      if (itemTag.tags && itemTag.tags.category === tagCategory) {
        const tagName = itemTag.tags.name;
        // まだグループが存在しない場合は作成
        if (!groupedItems[tagName]) {
          groupedItems[tagName] = [];
        }
        
        // アイテムを探す
        const item = userItems.find(item => item.id === itemTag.user_item_id);
        if (item && !groupedItems[tagName].find(i => i.id === item.id)) {
          groupedItems[tagName].push(item);
        }
      }
    }

    return groupedItems;
  } catch (error) {
    console.error("Error in getItemsGroupedByTag:", error);
    return {};
  }
}

// タググループ型
export interface TagGroup {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

// タググループを取得する関数
export async function getTagGroups(): Promise<{ [key: string]: string[] }> {
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("is_category", true)
      .order("name");

    if (error) {
      console.error("Error fetching tag groups:", error);
      return {};
    }

    const groups: { [key: string]: string[] } = {};

    // カテゴリとして設定されているタグを取得
    for (const group of data) {
      groups[group.name] = [];

      // 各カテゴリに属するタグを取得
      const { data: groupTags, error: groupError } = await supabase
        .from("tags")
        .select("name")
        .eq("category", group.name)
        .order("name");

      if (!groupError && groupTags) {
        groups[group.name] = groupTags.map(tag => tag.name);
      }
    }

    return groups;
  } catch (error) {
    console.error("Error in getTagGroups:", error);
    return {};
  }
}
