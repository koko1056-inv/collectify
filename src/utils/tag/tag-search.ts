import { supabase } from "@/integrations/supabase/client";
import { Tag, SimpleTag } from "@/types/tag";

/**
 * カテゴリーごとのタグを取得（承認済みのみ）
 */
export async function getTagsByCategory(category: string): Promise<Tag[]> {
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("category", category)
      .eq("status", "approved")
      .order("usage_count", { ascending: false })
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

/**
 * タグ名からタグIDを検索（承認済みのみ）
 */
export async function findTagIdByName(
  name: string,
  category?: string,
  contentId?: string | null
): Promise<string | null> {
  try {
    const query = supabase
      .from("tags")
      .select("id, name, category, content_id")
      .eq("name", name)
      .eq("status", "approved");
    
    if (category) {
      query.eq("category", category);
    }
    
    // キャラクターとシリーズの場合、content_idでフィルタリング
    if ((category === "character" || category === "series") && contentId) {
      query.eq("content_id", contentId);
    } else if (category === "type") {
      // タイプは全コンテンツ共通（content_idがnull）
      query.is("content_id", null);
    }
    
    const { data, error } = await query.maybeSingle();
    
    if (error) {
      console.error(`[findTagIdByName] Database error for tag "${name}":`, error);
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error(`[findTagIdByName] Exception while searching for tag "${name}":`, error);
    return null;
  }
}

/**
 * SimpleTagかどうかをチェック（型ガード関数）
 */
export function isSimpleTag(tag: any): tag is SimpleTag {
  return (
    typeof tag === 'object' &&
    tag !== null &&
    'id' in tag &&
    'name' in tag
  );
}

/**
 * グループ化されたタグを取得（承認済みのみ）
 * 注意: N+1クエリ問題あり - 将来的に最適化が必要
 */
export async function getTagGroups(): Promise<{[key: string]: string[]}> {
  try {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("is_category", true)
      .eq("status", "approved")
      .order("name");
    
    if (error) {
      console.error("Error fetching tag groups:", error);
      return {};
    }
    
    const groups: {[key: string]: string[]} = {};
    
    // カテゴリとして設定されているタグを取得
    for (const group of data) {
      groups[group.name] = [];
      
      // 各カテゴリに属するタグを取得（承認済みのみ）
      const { data: groupTags, error: groupError } = await supabase
        .from("tags")
        .select("name")
        .eq("category", group.name)
        .eq("status", "approved")
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
