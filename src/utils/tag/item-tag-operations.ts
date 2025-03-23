
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "@/types/tag";

// タグデータと使用回数を取得
export const getTagsWithCount = async (): Promise<Tag[]> => {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select(`
        id,
        name,
        category,
        created_at,
        item_tags (
          tag_id
        )
      `);

    if (error) throw error;

    // タグごとの使用回数をカウント
    return data.map((tag) => ({
      id: tag.id,
      name: tag.name,
      category: tag.category,
      created_at: tag.created_at,
      count: tag.item_tags ? tag.item_tags.length : 0
    }));
  } catch (error) {
    console.error('Error fetching tags with count:', error);
    return [];
  }
};

// 特定のアイテムに関連付けられたタグを取得
export const getItemTags = async (itemId: string): Promise<Tag[]> => {
  try {
    const { data, error } = await supabase
      .from('item_tags')
      .select(`
        tags (
          id,
          name,
          category,
          created_at
        )
      `)
      .eq('official_item_id', itemId);

    if (error) throw error;

    // タグオブジェクトを取り出して配列に変換
    return data
      .map(item => item.tags)
      .filter(Boolean)
      .map(tag => ({
        ...tag,
        count: 0 // デフォルト値を設定
      }));
  } catch (error) {
    console.error('Error fetching item tags:', error);
    return [];
  }
};

// SimpleItemTag の定義を修正
export interface SimpleItemTag {
  id: string;
  tag_id: string;
  tags: {
    id: string;
    name: string;
    category?: string;
    created_at?: string;
  } | null;
}

// アイテムにタグを追加する関数
export const addTagToItem = async (itemId: string, tagId: string, isUserItem: boolean = false): Promise<boolean> => {
  try {
    if (isUserItem) {
      const { error } = await supabase
        .from('user_item_tags')
        .insert({ user_item_id: itemId, tag_id: tagId });

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('item_tags')
        .insert({ official_item_id: itemId, tag_id: tagId });

      if (error) throw error;
    }
    return true;
  } catch (error) {
    console.error('Error adding tag to item:', error);
    return false;
  }
};

// アイテムからタグを削除する関数
export const removeTagFromItem = async (tagId: string, itemId: string, isUserItem: boolean = false): Promise<boolean> => {
  try {
    if (isUserItem) {
      const { error } = await supabase
        .from('user_item_tags')
        .delete()
        .eq('user_item_id', itemId)
        .eq('tag_id', tagId);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('item_tags')
        .delete()
        .eq('official_item_id', itemId)
        .eq('tag_id', tagId);

      if (error) throw error;
    }
    return true;
  } catch (error) {
    console.error('Error removing tag from item:', error);
    return false;
  }
};

// 特定のアイテムのタグを取得する関数
export const getTagsForItem = async (itemId: string, isUserItem: boolean = false): Promise<SimpleItemTag[]> => {
  try {
    const table = isUserItem ? 'user_item_tags' : 'item_tags';
    const idField = isUserItem ? 'user_item_id' : 'official_item_id';

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

    return data as SimpleItemTag[];
  } catch (error) {
    console.error('Error fetching tags for item:', error);
    return [];
  }
};

// 公式アイテムからユーザーアイテムにタグをコピーする関数
export const copyTagsFromOfficialItem = async (
  officialItemId: string,
  userItemId: string
): Promise<boolean> => {
  try {
    // 公式アイテムのタグを取得
    const officialTags = await getTagsForItem(officialItemId);
    
    // 各タグをユーザーアイテムに追加
    for (const tag of officialTags) {
      if (tag.tag_id) {
        await addTagToItem(userItemId, tag.tag_id, true);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error copying tags from official item:', error);
    return false;
  }
};
