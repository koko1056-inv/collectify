import { supabase } from "@/integrations/supabase/client";
import { ContentInfo } from "./types";

// コンテンツ情報の取得
export const fetchContentList = async (): Promise<ContentInfo[]> => {
  try {
    const { data, error } = await supabase
      .from("content_names")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching content list:", error);
      throw error;
    }

    // コンテンツデータを適切な形式に変換
    return (data || []).map(content => ({
      id: content.id,
      name: content.name,
      type: content.type || 'anime',
      created_at: content.created_at,
      created_by: content.created_by || '',
      icon_name: undefined  // この列はテーブルに存在しないので、undefinedを設定
    }));
  } catch (error) {
    console.error("Error in fetchContentList:", error);
    return [];
  }
};

// アイテムのコンテンツ情報を設定
export const setItemContent = async (
  itemId: string,
  contentName: string | null,
  isUserItem: boolean = false
): Promise<boolean> => {
  try {
    const table = isUserItem ? "user_items" : "official_items";
    
    // contentNameがnullの場合はnullを設定し、そうでない場合は文字列を設定
    const { error } = await supabase
      .from(table)
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
      .from("content_names")
      .select("*")
      .eq("name", contentName)
      .single();

    if (error) {
      console.error("Error fetching content by name:", error);
      return null;
    }

    // コンテンツデータを適切な形式に変換
    return {
      id: data.id,
      name: data.name,
      type: data.type || 'anime',
      created_at: data.created_at,
      created_by: data.created_by || '',
      icon_name: undefined  // この列はテーブルに存在しないので、undefinedを設定
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
    // iconNameをinsertデータに含めるかどうかを決定
    const insertData = iconName 
      ? { name, type, icon_name: iconName }
      : { name, type };

    const { data, error } = await supabase
      .from("content_names")
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    
    // コンテンツデータを適切な形式に変換
    return {
      id: data.id,
      name: data.name,
      type: data.type || 'anime',
      created_at: data.created_at,
      created_by: data.created_by || '',
      icon_name: undefined  // この列はテーブルに存在しないので、undefinedを設定
    };
  } catch (error) {
    console.error("Error creating new content:", error);
    return null;
  }
};
