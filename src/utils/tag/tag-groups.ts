
import { supabase } from "@/integrations/supabase/client";
import { TagGroupedItems } from "./types";
import { getTagsForItem } from "./tag-queries";
import { SimpleItemTag } from "./types";

// ユーザーのアイテムをタグでグループ化して取得
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
    
    // 各アイテムのタグを取得し、タグごとにグループ化
    const itemsByTag: TagGroupedItems = {};
    
    // 各アイテムに対して処理
    for (const item of userItems) {
      const tags = await getTagsForItem(item.id, true);
      
      // タグが存在しない場合は「その他」に分類
      if (!tags || tags.length === 0) {
        if (!itemsByTag["その他"]) {
          itemsByTag["その他"] = [];
        }
        itemsByTag["その他"].push(item);
        continue;
      }
      
      // 各タグに対して処理
      for (const tag of tags) {
        if (!tag.tags) continue;
        
        const tagName = tag.tags.name;
        if (!itemsByTag[tagName]) {
          itemsByTag[tagName] = [];
        }
        
        // 同じアイテムが複数回追加されないようにチェック
        if (!itemsByTag[tagName].some(existingItem => existingItem.id === item.id)) {
          itemsByTag[tagName].push(item);
        }
      }
    }
    
    return itemsByTag;
  } catch (error) {
    console.error("Error in getItemsGroupedByTag:", error);
    return {};
  }
}
