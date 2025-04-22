
import { supabase } from "@/integrations/supabase/client";
import { SimpleItemTag, SimpleTag } from "./types";

// タグ名からタグIDを検索する関数
export const findTagIdByName = async (tagName: string, category?: string) => {
  try {
    let query = supabase
      .from("tags")
      .select("id")
      .eq("name", tagName);
    
    if (category) {
      query = query.eq("category", category);
    }
    
    const { data, error } = await query.maybeSingle();
    
    if (error) throw error;
    return data?.id || null;
  } catch (error) {
    console.error("Error finding tag by name:", error);
    return null;
  }
};

// カテゴリでタグを検索する関数
export const getTagsByCategory = async (category: string) => {
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("id, name")
      .eq("category", category)
      .order("name");
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error fetching ${category} tags:`, error);
    return [];
  }
};

// シンプルなタグを検証する関数
export const isSimpleTag = (tag: any): tag is SimpleTag => {
  return tag && typeof tag.id === "string" && typeof tag.name === "string";
};

// アイテムのタグの中からカテゴリでタグを検索する関数
export const findTagByCategoryInItemTags = (tags: SimpleItemTag[], category: string): SimpleTag | null => {
  for (const tag of tags) {
    if (tag.tags && tag.tags.category === category) {
      return tag.tags;
    }
  }
  return null;
};

// タグ名から始まるタグを検索する関数（オートコンプリート用）
export const searchTagsByPrefix = async (prefix: string, category?: string, limit: number = 10) => {
  try {
    if (!prefix) return [];
    
    let query = supabase
      .from("tags")
      .select("id, name, category")
      .ilike("name", `${prefix}%`)
      .limit(limit);
    
    if (category) {
      query = query.eq("category", category);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error searching tags by prefix:", error);
    return [];
  }
};
