
import { supabase } from "@/integrations/supabase/client";
import { ContentInfo } from "./types";

// コンテンツ情報の取得
export const fetchContentList = async (): Promise<ContentInfo[]> => {
  try {
    const { data, error } = await supabase
      .from("content_info")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching content list:", error);
      throw error;
    }

    // icon_nameプロパティがない場合に対応するための変換
    return (data || []).map(content => ({
      id: content.id,
      name: content.name,
      type: content.type,
      created_at: content.created_at,
      created_by: content.created_by,
      icon_name: content.icon_name || undefined
    }));
  } catch (error) {
    console.error("Error in fetchContentList:", error);
    return [];
  }
};

// アイテムのコンテンツ情報を設定
export const setItemContent = async (
  itemId: string,
  contentName: string
) => {
  try {
    const { error } = await supabase
      .from("official_items")
      .update({ content_name: contentName })
      .eq("id", itemId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error setting item content:", error);
    return false;
  }
};

// コンテンツ名による検索
export const fetchContentByName = async (
  contentName: string
): Promise<ContentInfo | null> => {
  try {
    const { data, error } = await supabase
      .from("content_info")
      .select("*")
      .eq("name", contentName)
      .single();

    if (error) {
      console.error("Error fetching content by name:", error);
      return null;
    }

    // icon_nameプロパティがない場合に対応
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      created_at: data.created_at,
      created_by: data.created_by,
      icon_name: data.icon_name || undefined
    };
  } catch (error) {
    console.error("Error in fetchContentByName:", error);
    return null;
  }
};

// 新しいコンテンツの作成
export const createNewContent = async (
  name: string,
  type: string = "anime",
  iconName?: string
): Promise<ContentInfo | null> => {
  try {
    const { data, error } = await supabase
      .from("content_info")
      .insert([
        { 
          name, 
          type,
          icon_name: iconName
        }
      ])
      .select()
      .single();

    if (error) throw error;
    
    // icon_nameプロパティがない場合に対応
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      created_at: data.created_at,
      created_by: data.created_by,
      icon_name: data.icon_name || undefined
    };
  } catch (error) {
    console.error("Error creating new content:", error);
    return null;
  }
};
