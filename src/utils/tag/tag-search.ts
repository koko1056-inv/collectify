
import { supabase } from "@/integrations/supabase/client";
import { SimpleTag } from "./types";

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
