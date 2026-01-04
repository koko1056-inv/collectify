import { supabase } from "@/integrations/supabase/client";
import { TagGroupedItems, ItemsGroupedByTag } from "@/types/tag";

/**
 * タグでグループ化されたアイテムを取得する関数
 */
export async function getItemsGroupedByTag(
  userId: string, 
  tagCategory?: string 
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

    // タグを取得（オプションでカテゴリでフィルタリング）
    let tagsQuery = supabase.from("tags").select("id, name");
    
    // カテゴリが指定されている場合は、そのカテゴリのタグのみを取得
    if (tagCategory && typeof tagCategory === 'string') {
      tagsQuery = tagsQuery.eq("category", tagCategory);
    }
    
    const { data: tags, error: tagsError } = await tagsQuery;

    if (tagsError) throw tagsError;
    if (!tags || tags.length === 0) return {};

    // 各タグに関連するアイテムを収集
    const groupedItems: TagGroupedItems = {};

    // タグIDとタグ名のマッピングを作成
    tags.forEach(tag => {
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
      if (itemTag.tags) {
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

/**
 * カスタムグループでアイテムをグループ化する関数
 */
export async function getItemsGroupedByCustomGroups(
  userId: string
): Promise<ItemsGroupedByTag[]> {
  try {
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
    const groupedByContent: Record<string, any[]> = {};
    data?.forEach(item => {
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
