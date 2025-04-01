
import { supabase } from "@/integrations/supabase/client";
import { TagGroupedItems } from "./types";

// タグでグループ化されたアイテムを取得する
export async function getItemsGroupedByTag(userId: string): Promise<TagGroupedItems> {
  try {
    // ユーザーのアイテムを取得
    const { data: userItems, error: itemsError } = await supabase
      .from("user_items")
      .select("*")
      .eq("user_id", userId);

    if (itemsError) {
      console.error("Error fetching user items:", itemsError);
      return {};
    }

    if (!userItems || userItems.length === 0) {
      return {};
    }

    // アイテムのIDリストを作成
    const itemIds = userItems.map(item => item.id);

    // アイテムに関連するタグを取得
    const { data: itemTags, error: tagsError } = await supabase
      .from("user_item_tags")
      .select(`
        tag_id,
        user_item_id,
        tags (
          id,
          name,
          category
        )
      `)
      .in("user_item_id", itemIds);

    if (tagsError) {
      console.error("Error fetching tags for items:", tagsError);
      return {};
    }

    // タグ名でアイテムをグループ化
    const groupedItems: TagGroupedItems = {};

    for (const item of userItems) {
      // このアイテムに関連するタグを見つける
      const itemTagsFiltered = itemTags.filter(tag => tag.user_item_id === item.id);
      
      if (itemTagsFiltered.length === 0) {
        // タグがない場合は「未分類」に入れる
        if (!groupedItems["未分類"]) {
          groupedItems["未分類"] = [];
        }
        groupedItems["未分類"].push(item);
        continue;
      }

      // 各タグごとにアイテムを追加
      for (const tagRelation of itemTagsFiltered) {
        if (tagRelation.tags) {
          const tagName = tagRelation.tags.name;
          if (!groupedItems[tagName]) {
            groupedItems[tagName] = [];
          }
          
          // 同じアイテムを複数回追加しないようにチェック
          if (!groupedItems[tagName].some(i => i.id === item.id)) {
            groupedItems[tagName].push(item);
          }
        }
      }
    }

    return groupedItems;
  } catch (error) {
    console.error("Error in getItemsGroupedByTag:", error);
    return {};
  }
}

// アイテムをグループに追加（新しく実装）
export async function addItemsToGroup(
  groupId: string,
  itemIds: string[]
): Promise<boolean> {
  try {
    // 既存の関連付けを削除
    const { error: deleteError } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .in("user_id", itemIds);

    if (deleteError) {
      console.error("Error deleting existing group items:", deleteError);
      return false;
    }

    // 新しい関連付けを挿入
    const groupItems = itemIds.map((itemId) => ({
      group_id: groupId,
      user_id: itemId,
    }));

    const { error: insertError } = await supabase
      .from("group_members")
      .insert(groupItems);

    if (insertError) {
      console.error("Error adding items to group:", insertError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in addItemsToGroup:", error);
    return false;
  }
}
