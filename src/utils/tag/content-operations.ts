
import { supabase } from "@/integrations/supabase/client";
import { ContentInfo } from "./types";

// コンテンツ情報を取得
export async function getContentInfo(contentName: string | null): Promise<ContentInfo | null> {
  if (!contentName) return null;
  
  try {
    const { data, error } = await supabase
      .from("content_names")
      .select("*")
      .eq("name", contentName)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching content info:", error);
      return null;
    }
    
    return data as ContentInfo;
  } catch (error) {
    console.error("Error in getContentInfo:", error);
    return null;
  }
}

// コンテンツ名の一覧を取得
export async function getContentNames(): Promise<ContentInfo[]> {
  try {
    const { data, error } = await supabase
      .from("content_names")
      .select("*")
      .order("name");
    
    if (error) {
      console.error("Error fetching content names:", error);
      return [];
    }
    
    return data as ContentInfo[];
  } catch (error) {
    console.error("Error in getContentNames:", error);
    return [];
  }
}

// コンテンツタイプの一覧を取得
export async function getContentTypes(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("content_names")
      .select("type")
      .order("type");
    
    if (error) {
      console.error("Error fetching content types:", error);
      return [];
    }
    
    // 重複を除去
    const types = [...new Set(data.map(item => item.type).filter(Boolean))];
    return types as string[];
  } catch (error) {
    console.error("Error in getContentTypes:", error);
    return [];
  }
}

// 特定のコンテンツタイプのコンテンツを取得
export async function getContentsByType(contentType: string): Promise<ContentInfo[]> {
  try {
    const { data, error } = await supabase
      .from("content_names")
      .select("*")
      .eq("type", contentType)
      .order("name");
    
    if (error) {
      console.error(`Error fetching contents of type ${contentType}:`, error);
      return [];
    }
    
    return data.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      created_at: item.created_at,
      created_by: item.created_by,
      icon_name: item.icon_name
    }));
  } catch (error) {
    console.error(`Error in getContentsByType for ${contentType}:`, error);
    return [];
  }
}

// アイテムのコンテンツを設定
export async function setItemContent(
  itemId: string,
  contentName: string | null,
  isUserItem: boolean
): Promise<boolean> {
  try {
    const table = isUserItem ? "user_items" : "official_items";
    
    const { error } = await supabase
      .from(table)
      .update({ content_name: contentName })
      .eq("id", itemId);
    
    if (error) {
      console.error(`Error setting content for ${table} ${itemId}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error in setItemContent for ${itemId}:`, error);
    return false;
  }
}
