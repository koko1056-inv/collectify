
import { supabase } from "@/integrations/supabase/client";
import { SimpleTag, SimpleItemTag, TaggedItemGroups, UserItem, TagQueryItem, ContentInfo } from "./types";

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

// コンテンツ情報を取得する関数
export async function getContentInfo(): Promise<ContentInfo[]> {
  try {
    const { data, error } = await supabase
      .from("content_names")
      .select("*")
      .order("name");
    
    if (error) {
      console.error("Error fetching content info:", error);
      return [];
    }
    
    return data as ContentInfo[];
  } catch (error) {
    console.error("Error in getContentInfo:", error);
    return [];
  }
}

// コンテンツアイコンを更新する関数
export async function updateContentIcon(contentId: string, iconName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("content_names")
      .update({ icon_name: iconName })
      .eq("id", contentId);
    
    if (error) {
      console.error("Error updating content icon:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in updateContentIcon:", error);
    return false;
  }
}
