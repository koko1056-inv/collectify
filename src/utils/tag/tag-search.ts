
import { supabase } from "@/integrations/supabase/client";
import { SimpleTag, Tag } from "./types";

// カテゴリーごとのタグを取得
export async function getTagsByCategory(
  category: string
): Promise<Tag[]> {
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
    
    return data as Tag[];
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
  try {
    console.log(`[findTagIdByName] Searching for tag: name="${name}", category="${category}"`);
    
    const query = supabase.from("tags").select("id, name, category").eq("name", name);
    
    if (category) {
      query.eq("category", category);
    }
    
    const { data, error } = await query.maybeSingle();
    
    console.log(`[findTagIdByName] Query result:`, { data, error });
    
    if (error) {
      console.error(`[findTagIdByName] Database error for tag "${name}":`, error);
      return null;
    }
    
    if (!data) {
      console.error(`[findTagIdByName] Tag not found: "${name}"`);
      return null;
    }
    
    console.log(`[findTagIdByName] Found tag ID: ${data.id} for name: ${name}`);
    return data.id;
  } catch (error) {
    console.error(`[findTagIdByName] Exception while searching for tag "${name}":`, error);
    return null;
  }
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

// グループ化されたタグを取得
export async function getTagGroups(): Promise<{[key: string]: string[]}> {
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("is_category", true)
      .order("name");
    
    if (error) {
      console.error("Error fetching tag groups:", error);
      return {};
    }
    
    const groups: {[key: string]: string[]} = {};
    
    // カテゴリとして設定されているタグを取得
    for (const group of data) {
      groups[group.name] = [];
      
      // 各カテゴリに属するタグを取得
      const { data: groupTags, error: groupError } = await supabase
        .from("tags")
        .select("name")
        .eq("category", group.name)
        .order("name");
      
      if (!groupError && groupTags) {
        groups[group.name] = groupTags.map(tag => tag.name);
      }
    }
    
    return groups;
  } catch (error) {
    console.error("Error in getTagGroups:", error);
    return {};
  }
}
