
import { supabase } from "@/integrations/supabase/client";
import { ContentInfo } from "./types";

// コンテンツ情報を取得する関数
export async function getContentInfo(contentId: string): Promise<ContentInfo | null> {
  try {
    const { data, error } = await supabase
      .from("content_names")
      .select("*")
      .eq("id", contentId)
      .single();

    if (error) {
      console.error("Error fetching content info:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      created_at: data.created_at,
      created_by: data.created_by,
      icon_name: data.icon_name || "box" // デフォルト値を設定
    };
  } catch (error) {
    console.error("Error in getContentInfo:", error);
    return null;
  }
}

// 使用可能なコンテンツのリストを取得する
export async function getAvailableContents(): Promise<ContentInfo[]> {
  try {
    const { data, error } = await supabase
      .from("content_names")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching contents:", error);
      return [];
    }

    // データが存在しない場合は空の配列を返す
    if (!data || data.length === 0) {
      return [];
    }

    // 結果を整形して返す
    return data.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      created_at: item.created_at,
      created_by: item.created_by,
      icon_name: item.icon_name || "box" // デフォルト値を設定
    }));
  } catch (error) {
    console.error("Error in getAvailableContents:", error);
    return [];
  }
}

// コンテンツ名に基づいてコンテンツIDを取得
export async function getContentIdByName(contentName: string): Promise<string | null> {
  if (!contentName || contentName.trim() === "") {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("content_names")
      .select("id")
      .eq("name", contentName)
      .single();

    if (error) {
      console.error("Error fetching content ID by name:", error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error("Error in getContentIdByName:", error);
    return null;
  }
}

// コンテンツIDに基づいてコンテンツ情報を取得
export async function getContentById(contentId: string): Promise<ContentInfo | null> {
  if (!contentId) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("content_names")
      .select("*")
      .eq("id", contentId)
      .single();

    if (error) {
      console.error("Error fetching content by ID:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      created_at: data.created_at,
      created_by: data.created_by,
      icon_name: data.icon_name || "box" // デフォルト値を設定
    };
  } catch (error) {
    console.error("Error in getContentById:", error);
    return null;
  }
}
