
import { supabase } from "@/integrations/supabase/client";
import { SimpleTag, SimpleItemTag } from "./types";

// 特定のアイテムに関連するタグを取得
export async function getTagsForItem(
  itemId: string,
  isUserItem: boolean
): Promise<SimpleItemTag[]> {
  try {
    const { data, error } = await supabase
      .from(isUserItem ? "user_item_tags" : "item_tags")
      .select(`
        tag_id,
        tags (
          id,
          name,
          category,
          created_at
        )
      `)
      .eq(isUserItem ? "user_item_id" : "official_item_id", itemId);

    if (error) {
      console.error("Error fetching tags for item:", error);
      return [];
    }

    return data as SimpleItemTag[];
  } catch (error) {
    console.error("Error in getTagsForItem:", error);
    return [];
  }
}

// アイテムがユーザーのコレクションに存在するかチェック
export async function isItemInUserCollection(
  itemId: string,
  userId: string
): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from("user_items")
      .select("*", { count: 'exact', head: true })
      .eq("official_item_id", itemId)
      .eq("user_id", userId);
    
    if (error) {
      console.error("Error checking if item is in collection:", error);
      return false;
    }
    
    return (count || 0) > 0;
  } catch (error) {
    console.error("Error in isItemInUserCollection:", error);
    return false;
  }
}

// カテゴリーごとのタグを取得
export async function getTagsByCategory(
  category: string
): Promise<SimpleTag[]> {
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("category", category)
      .order("name");
    
    if (error) {
      console.error(`Error fetching ${category} tags:`, error);
      return [];
    }
    
    return data as SimpleTag[];
  } catch (error) {
    console.error(`Error in getTagsByCategory for ${category}:`, error);
    return [];
  }
}

// タグ名からタグIDを検索
export async function findTagIdByName(
  name: string,
  category?: string
): Promise<string | null> {
  const query = supabase.from("tags").select("id").eq("name", name);
  
  if (category) {
    query.eq("category", category);
  }
  
  const { data, error } = await query.maybeSingle();
  
  if (error || !data) {
    console.error(`Tag not found: ${name}`, error);
    return null;
  }
  
  return data.id;
}

// SimpleTagかどうかをチェック（型ガード関数）
export function isSimpleTag(tag: any): tag is SimpleTag {
  return (
    typeof tag === 'object' &&
    tag !== null &&
    'id' in tag &&
    'name' in tag
  );
}

// タグでグループ化されたアイテムを取得する関数
export async function getItemsGroupedByTag(userId: string): Promise<Record<string, any[]>> {
  try {
    // ユーザーのアイテムを取得
    const { data: userItems, error: itemsError } = await supabase
      .from("user_items")
      .select(`
        id,
        title,
        image,
        quantity,
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
    const groupedItems: Record<string, any[]> = {};

    userItems?.forEach(item => {
      if (!item.user_item_tags || item.user_item_tags.length === 0) {
        // タグがないアイテムは「未分類」に入れる
        if (!groupedItems["未分類"]) {
          groupedItems["未分類"] = [];
        }
        groupedItems["未分類"].push(item);
        return;
      }

      item.user_item_tags.forEach((tagRelation: any) => {
        if (tagRelation.tags) {
          const tagName = tagRelation.tags.name;
          if (!groupedItems[tagName]) {
            groupedItems[tagName] = [];
          }
          
          // 同じアイテムが重複して追加されないよう確認
          const existingItem = groupedItems[tagName].find(existingItem => existingItem.id === item.id);
          if (!existingItem) {
            groupedItems[tagName].push(item);
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
