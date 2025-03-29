
/**
 * コンテンツ関連の操作を行うためのユーティリティ
 */
import { supabase } from "@/integrations/supabase/client";
import { ContentInfo } from "./types";

/**
 * 全てのコンテンツ情報を取得
 */
export const fetchAllContents = async (): Promise<ContentInfo[]> => {
  try {
    const { data, error } = await supabase
      .from("content_names")
      .select("*");

    if (error) throw error;

    return (data || []).map(content => ({
      id: content.id,
      name: content.name,
      type: content.type,
      created_at: content.created_at,
      created_by: content.created_by || "",
      // icon_nameはデータベースに存在しないため、デフォルト値を設定
      icon_name: ""
    }));
  } catch (error) {
    console.error("Error fetching all contents:", error);
    return [];
  }
};

/**
 * コンテンツ名で検索して情報を取得
 */
export const findContentByName = async (contentName: string): Promise<ContentInfo | null> => {
  try {
    if (!contentName) return null;

    const { data, error } = await supabase
      .from("content_names")
      .select("*")
      .ilike("name", contentName)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      created_at: data.created_at,
      created_by: data.created_by || "",
      // icon_nameはデータベースに存在しないため、デフォルト値を設定
      icon_name: ""
    };
  } catch (error) {
    console.error("Error finding content by name:", error);
    return null;
  }
};

/**
 * コンテンツIDで検索して情報を取得
 */
export const findContentById = async (contentId: string): Promise<ContentInfo | null> => {
  try {
    if (!contentId) return null;

    const { data, error } = await supabase
      .from("content_names")
      .select("*")
      .eq("id", contentId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      created_at: data.created_at,
      created_by: data.created_by || "",
      // icon_nameはデータベースに存在しないため、デフォルト値を設定
      icon_name: ""
    };
  } catch (error) {
    console.error("Error finding content by ID:", error);
    return null;
  }
};
