
import { supabase } from "@/integrations/supabase/client";
import { TagGroupedItems } from "./types";
import { getTagsForItem } from "./tag-queries";
import { getTagGroups } from "./tag-search";

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

// カスタムグループでアイテムを整理する関数
export async function getItemsGroupedByCustomGroups(userId: string): Promise<TagGroupedItems> {
  try {
    // 既存のタググループを取得
    const tagGroups = await getTagGroups();
    
    // ユーザーのアイテムを取得
    const { data: userItems, error: itemsError } = await supabase
      .from("user_items")
      .select("*")
      .eq("user_id", userId);
    
    if (itemsError || !userItems || userItems.length === 0) {
      return {};
    }
    
    const itemsByGroup: TagGroupedItems = {};
    
    // まずは「すべて」グループを作成
    itemsByGroup["すべて"] = [...userItems];
    
    // 次に各グループに対応するアイテムを収集
    for (const [groupName, tagNames] of Object.entries(tagGroups)) {
      itemsByGroup[groupName] = [];
      
      // 各アイテムをチェック
      for (const item of userItems) {
        const itemTags = await getTagsForItem(item.id, true);
        const itemTagNames = itemTags.map(t => t.tags?.name).filter(Boolean) as string[];
        
        // アイテムのタグのいずれかがこのグループに属していれば追加
        if (itemTagNames.some(tagName => tagNames.includes(tagName))) {
          if (!itemsByGroup[groupName].some(existingItem => existingItem.id === item.id)) {
            itemsByGroup[groupName].push(item);
          }
        }
      }
      
      // 空のグループは削除
      if (itemsByGroup[groupName].length === 0) {
        delete itemsByGroup[groupName];
      }
    }
    
    // その他のグループを作成（どのグループにも属さないアイテム）
    const groupedItems = new Set<string>();
    Object.values(itemsByGroup).forEach(items => {
      items.forEach(item => groupedItems.add(item.id));
    });
    
    const ungroupedItems = userItems.filter(item => !groupedItems.has(item.id));
    if (ungroupedItems.length > 0) {
      itemsByGroup["その他"] = ungroupedItems;
    }
    
    return itemsByGroup;
  } catch (error) {
    console.error("Error in getItemsGroupedByCustomGroups:", error);
    return {};
  }
}
