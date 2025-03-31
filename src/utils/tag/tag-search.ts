
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "@/types/tag";
import { SimpleItemTag } from "./types";

// タグを検索する (カテゴリごとにグループ化)
export async function searchTagsByCategory(
  query: string,
  limit: number = 10
): Promise<{ [category: string]: Tag[] }> {
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .ilike("name", `%${query}%`)
      .order("name")
      .limit(limit);

    if (error) {
      console.error("Error searching tags:", error);
      return {};
    }

    // カテゴリごとにグループ化
    const groupedTags: { [category: string]: Tag[] } = {};
    
    data.forEach((tag: Tag) => {
      const category = tag.category || "その他";
      if (!groupedTags[category]) {
        groupedTags[category] = [];
      }
      groupedTags[category].push(tag);
    });
    
    return groupedTags;
  } catch (error) {
    console.error("Error in searchTagsByCategory:", error);
    return {};
  }
}

// 人気のタグを取得する
export async function getPopularTags(limit: number = 10): Promise<Tag[]> {
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("usage_count", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching popular tags:", error);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error("Error in getPopularTags:", error);
    return [];
  }
}

// カテゴリごとのタグを取得する
export async function getTagsByCategory(): Promise<{ [category: string]: Tag[] }> {
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching tags by category:", error);
      return {};
    }

    // カテゴリごとにグループ化
    const groupedTags: { [category: string]: Tag[] } = {};
    
    data.forEach((tag: Tag) => {
      const category = tag.category || "その他";
      if (!groupedTags[category]) {
        groupedTags[category] = [];
      }
      groupedTags[category].push(tag);
    });
    
    return groupedTags;
  } catch (error) {
    console.error("Error in getTagsByCategory:", error);
    return {};
  }
}
