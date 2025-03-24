
import { supabase } from "@/integrations/supabase/client";
import { SimpleItemTag, SimpleTag } from "./types";

// アイテムに対するタグを取得する関数
export async function getTagsForItem(
  itemId: string,
  isUserItem: boolean = false
): Promise<SimpleItemTag[]> {
  const table = isUserItem ? "user_item_tags" : "item_tags";
  const itemCol = isUserItem ? "user_item_id" : "official_item_id";

  const { data, error } = await supabase
    .from(table)
    .select(`
      id,
      tag_id,
      tags (
        id,
        name,
        category
      )
    `)
    .eq(itemCol, itemId);

  if (error) {
    console.error(`Error fetching tags for item: ${error.message}`);
    throw error;
  }

  return data || [];
}

// ユーザーの過去に使用したタグを取得する関数
export async function getUserPreviousTags(): Promise<SimpleItemTag[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_item_tags")
    .select(`
      id,
      tag_id,
      tags (
        id,
        name,
        category
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`Error fetching user's previous tags: ${error.message}`);
    throw error;
  }

  // ユニークなタグのみを返す
  const uniqueTags = new Map();
  data?.forEach(tag => {
    if (!uniqueTags.has(tag.tag_id)) {
      uniqueTags.set(tag.tag_id, tag);
    }
  });

  return Array.from(uniqueTags.values());
}

// カテゴリ別のタグを取得する関数
export async function getTagsByCategory(): Promise<Record<string, SimpleTag[]>> {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("name");

  if (error) {
    console.error(`Error fetching tags by category: ${error.message}`);
    throw error;
  }

  const tagsByCategory: Record<string, SimpleTag[]> = {};
  
  data?.forEach(tag => {
    const category = tag.category || "その他";
    if (!tagsByCategory[category]) {
      tagsByCategory[category] = [];
    }
    tagsByCategory[category].push(tag);
  });

  return tagsByCategory;
}

// タグでグループ化されたアイテムを取得する関数
export async function getItemsGroupedByTag(userId: string) {
  if (!userId) return {};

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
    console.error(`Error fetching user items: ${itemsError.message}`);
    throw itemsError;
  }

  if (!userItems || userItems.length === 0) {
    return {};
  }

  // タグごとにアイテムをグループ化
  const itemsByTag: Record<string, any[]> = {};

  userItems.forEach(item => {
    if (item.user_item_tags && item.user_item_tags.length > 0) {
      item.user_item_tags.forEach((tagRelation: any) => {
        if (tagRelation.tags) {
          const tagName = tagRelation.tags.name;
          if (!itemsByTag[tagName]) {
            itemsByTag[tagName] = [];
          }
          // 同じアイテムが重複しないように確認
          if (!itemsByTag[tagName].some(existingItem => existingItem.id === item.id)) {
            itemsByTag[tagName].push({
              id: item.id,
              title: item.title,
              image: item.image,
              quantity: item.quantity || 1
            });
          }
        }
      });
    }
  });

  return itemsByTag;
}
