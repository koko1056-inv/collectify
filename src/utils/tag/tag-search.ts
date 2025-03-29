
import { supabase } from "@/integrations/supabase/client";
import { SimpleTag } from "./types";

// カテゴリ別にタグを取得する
export const getTagsByCategory = async (category: string): Promise<SimpleTag[]> => {
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("category", category)
      .order("name");

    if (error) {
      console.error(`Error fetching tags for category ${category}:`, error);
      throw error;
    }

    return data.map(tag => ({
      id: tag.id,
      name: tag.name,
      category: tag.category,
      created_at: tag.created_at
    }));
  } catch (error) {
    console.error(`Error in getTagsByCategory:`, error);
    return [];
  }
};

// タグ名からタグIDを検索する
export const findTagIdByName = async (
  tagName: string,
  category?: string
): Promise<string | null> => {
  try {
    let query = supabase
      .from("tags")
      .select("id")
      .eq("name", tagName);
    
    if (category) {
      query = query.eq("category", category);
    }
    
    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error(`Error finding tag ID for ${tagName}:`, error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error(`Error in findTagIdByName:`, error);
    return null;
  }
};

// オブジェクトがSimpleTagかどうかを判定するヘルパー関数
export const isSimpleTag = (obj: any): obj is SimpleTag => {
  return obj && 
    typeof obj === 'object' && 
    'id' in obj && 
    'name' in obj;
};
