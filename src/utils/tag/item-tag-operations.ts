
import { supabase } from "@/integrations/supabase/client";

// 循環参照を防ぐために単純化されたタグインターフェース
interface SimpleTag {
  id: string;
  name: string;
  category?: string;
  created_at?: string;
}

// 単純化されたタグ関連のインターフェース
export interface SimpleItemTag {
  id: string;
  tag_id: string;
  tags?: SimpleTag | null;
}

/**
 * Get tags for a specific item
 */
export const getTagsForItem = async (
  itemId: string,
  isUserItem: boolean = false
): Promise<SimpleItemTag[]> => {
  try {
    const table = isUserItem ? "user_item_tags" : "item_tags";
    const idField = isUserItem ? "user_item_id" : "official_item_id";

    const { data, error } = await supabase
      .from(table)
      .select(`
        id,
        tag_id,
        tags (
          id,
          name,
          category,
          created_at
        )
      `)
      .eq(idField, itemId);
    
    if (error) throw error;
    return (data || []) as SimpleItemTag[];
  } catch (error) {
    console.error("Error fetching tags for item:", error);
    return [];
  }
};

/**
 * アイテムからタグを削除する
 */
export const removeTagFromItem = async (
  tagId: string,
  itemId: string,
  isUserItem: boolean = false
) => {
  const table = isUserItem ? "user_item_tags" : "item_tags";
  const idField = isUserItem ? "user_item_id" : "official_item_id";

  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("tag_id", tagId)
      .eq(idField, itemId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error removing tag:", error);
    throw error;
  }
};

/**
 * アイテムにタグを追加する
 */
export const addTagToItem = async (
  itemId: string,
  tagId: string,
  isUserItem: boolean = false
) => {
  const table = isUserItem ? "user_item_tags" : "item_tags";
  const idField = isUserItem ? "user_item_id" : "official_item_id";

  // 既に存在するかチェック
  const { data: existingTag, error: checkError } = await supabase
    .from(table)
    .select("*")
    .eq("tag_id", tagId)
    .eq(idField, itemId)
    .maybeSingle();

  if (checkError) throw checkError;

  // 既に存在する場合は追加しない
  if (existingTag) {
    return { success: true, exists: true };
  }

  // タグを追加
  const insertData = isUserItem 
    ? { tag_id: tagId, user_item_id: itemId }
    : { tag_id: tagId, official_item_id: itemId };

  const { error } = await supabase
    .from(table)
    .insert(insertData);
  
  if (error) throw error;
  
  return { success: true, exists: false };
};

/**
 * 公式アイテムからタグを取得してユーザーアイテムにコピーする
 */
export const copyTagsFromOfficialItem = async (
  officialItemId: string,
  userItemId: string
) => {
  try {
    // 公式アイテムのタグを取得
    const { data: officialTags, error: getError } = await supabase
      .from("item_tags")
      .select(`
        tag_id
      `)
      .eq("official_item_id", officialItemId);
    
    if (getError) throw getError;
    if (!officialTags || officialTags.length === 0) return { success: true, count: 0 };

    // 既存のユーザーアイテムタグを取得
    const { data: existingTags, error: existingError } = await supabase
      .from("user_item_tags")
      .select("tag_id")
      .eq("user_item_id", userItemId);
    
    if (existingError) throw existingError;
    
    // 既存のタグIDのセットを作成
    const existingTagIds = new Set((existingTags || []).map(tag => tag.tag_id));
    
    // 追加するタグを準備
    const tagsToAdd = officialTags
      .filter(tag => !existingTagIds.has(tag.tag_id))
      .map(tag => ({
        user_item_id: userItemId,
        tag_id: tag.tag_id
      }));
    
    if (tagsToAdd.length === 0) return { success: true, count: 0 };
    
    // 新しいタグを追加
    const { error: insertError } = await supabase
      .from("user_item_tags")
      .insert(tagsToAdd);
    
    if (insertError) throw insertError;
    
    return { success: true, count: tagsToAdd.length };
  } catch (error) {
    console.error("Error copying tags:", error);
    return { success: false, error };
  }
};

/**
 * タグごとにグループ化されたアイテムを取得する
 */
export const getItemsGroupedByTag = async (
  userId: string,
  isUserItem: boolean = true
) => {
  try {
    // ユーザーのアイテムとそのタグを取得
    const table = isUserItem ? "user_items" : "official_items";
    const tagsTable = isUserItem ? "user_item_tags" : "item_tags";
    const idField = isUserItem ? "user_id" : "created_by";

    // まずユーザーのアイテムを全て取得
    const { data: items, error: itemsError } = await supabase
      .from(table)
      .select("*")
      .eq(idField, userId);

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) return {};

    // 各アイテムのタグを取得
    const itemsByTagMap: Record<string, any[]> = {};
    const noTagItems: any[] = [];

    // 各アイテムのタグを並行して取得
    const itemTagPromises = items.map(async (item) => {
      const itemIdField = isUserItem ? "user_item_id" : "official_item_id";
      const { data: tagData } = await supabase
        .from(tagsTable)
        .select(`
          tags (
            id,
            name,
            category
          )
        `)
        .eq(itemIdField, item.id);

      // タグがないアイテムは別に保存
      if (!tagData || tagData.length === 0) {
        noTagItems.push(item);
        return;
      }

      // 各タグごとにアイテムをグループ化
      tagData.forEach((tagItem) => {
        if (tagItem.tags) {
          const tagName = tagItem.tags.name;
          if (!itemsByTagMap[tagName]) {
            itemsByTagMap[tagName] = [];
          }
          // 同じアイテムが重複して追加されないようにチェック
          if (!itemsByTagMap[tagName].some(existingItem => existingItem.id === item.id)) {
            itemsByTagMap[tagName].push(item);
          }
        }
      });
    });

    // 全てのプロミスが完了するのを待つ
    await Promise.all(itemTagPromises);

    // タグなしのアイテムがある場合は「その他」カテゴリに入れる
    if (noTagItems.length > 0) {
      itemsByTagMap["その他"] = noTagItems;
    }

    return itemsByTagMap;
  } catch (error) {
    console.error("Error grouping items by tag:", error);
    return {};
  }
};
