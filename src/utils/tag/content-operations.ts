
import { supabase } from "@/integrations/supabase/client";
import { ContentInfo } from "./types";

// コンテンツを取得する関数
export async function getContentByName(name: string | null): Promise<ContentInfo | null> {
  if (!name) return null;
  
  try {
    const { data, error } = await supabase
      .from("content_names")
      .select("*")
      .eq("name", name)
      .single();
    
    if (error) {
      console.error("Error fetching content by name:", error);
      return null;
    }
    
    return data as ContentInfo;
  } catch (error) {
    console.error("Error in getContentByName:", error);
    return null;
  }
}

// コンテンツのリストを取得する関数
export async function getAllContents(): Promise<ContentInfo[]> {
  try {
    const { data, error } = await supabase
      .from("content_names")
      .select("*")
      .order("name");
    
    if (error) {
      console.error("Error fetching all contents:", error);
      return [];
    }
    
    return data as ContentInfo[];
  } catch (error) {
    console.error("Error in getAllContents:", error);
    return [];
  }
}

// 特定のタイプのコンテンツを取得する関数
export async function getContentsByType(type: string): Promise<ContentInfo[]> {
  try {
    const { data, error } = await supabase
      .from("content_names")
      .select("*")
      .eq("type", type)
      .order("name");
    
    if (error) {
      console.error(`Error fetching contents of type ${type}:`, error);
      return [];
    }
    
    return data as ContentInfo[];
  } catch (error) {
    console.error("Error in getContentsByType:", error);
    return [];
  }
}

// アイテムのコンテンツを設定する関数
export async function setItemContent(
  itemId: string,
  contentName: string | null,
  isUserItem: boolean = false
): Promise<boolean> {
  if (!itemId) return false;
  
  try {
    const table = isUserItem ? "user_items" : "official_items";
    
    const { error } = await supabase
      .from(table)
      .update({ content_name: contentName })
      .eq("id", itemId);
    
    if (error) {
      console.error(`Error setting content for ${table}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in setItemContent:", error);
    return false;
  }
}
