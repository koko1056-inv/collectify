
import { supabase } from "@/integrations/supabase/client";
import { ContentInfo } from "./types";

// 全てのコンテンツ名を取得する関数
export async function getAllContentNames(): Promise<ContentInfo[]> {
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
    console.error("Error in getAllContentNames:", error);
    return [];
  }
}

// コンテンツ名でフィルタリングする関数
export async function getContentByName(name: string): Promise<ContentInfo | null> {
  try {
    const { data, error } = await supabase
      .from("content_names")
      .select("*")
      .eq("name", name)
      .maybeSingle();
    
    if (error || !data) {
      console.error("Error fetching content by name:", error);
      return null;
    }
    
    return data as ContentInfo;
  } catch (error) {
    console.error("Error in getContentByName:", error);
    return null;
  }
}

// 新しいコンテンツを追加する関数
export async function addNewContent(name: string, type: string = "other"): Promise<ContentInfo | null> {
  try {
    const { data, error } = await supabase
      .from("content_names")
      .insert([{ name, type }])
      .select()
      .single();
    
    if (error) {
      console.error("Error adding new content:", error);
      return null;
    }
    
    return data as ContentInfo;
  } catch (error) {
    console.error("Error in addNewContent:", error);
    return null;
  }
}

// コンテンツアイコンを更新する関数
export async function updateContentIcon(contentId: string, iconName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("content_names")
      .update({ icon_name: iconName })
      .eq("id", contentId);
    
    if (error) {
      console.error("Error updating content icon:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in updateContentIcon:", error);
    return false;
  }
}

/**
 * アイテムのコンテンツを設定する
 */
export async function setItemContent(
  itemId: string, 
  contentName: string | null,
  isUserItem: boolean = false
): Promise<{ success: boolean }> {
  try {
    const table = isUserItem ? "user_items" : "official_items";
    
    const { error } = await supabase
      .from(table)
      .update({ content_name: contentName })
      .eq("id", itemId);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error(`Error setting content for item ${itemId}:`, error);
    return { success: false };
  }
}
