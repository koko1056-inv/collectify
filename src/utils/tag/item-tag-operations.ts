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
        updated_at,
        item_tags (
          tag_id
        )
      `);

    if (error) throw error;

    // タグごとの使用回数をカウント
    return data.map((tag) => ({
      ...tag,
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
          created_at,
          updated_at
        )
      `)
      .eq('item_id', itemId);

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
