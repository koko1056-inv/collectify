import { supabase } from "@/integrations/supabase/client";

export interface ContentInfo {
  id: number;
  name: string;
  type: string;
  created_at: string;
  created_by: string;
  icon_name: string;
}

// テーブルからコンテンツ情報を取得する
export async function getContentInfo(): Promise<ContentInfo[]> {
  try {
    const { data, error } = await supabase
      .from("content_names")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching content info:", error);
      return [];
    }

    // ここでicon_nameプロパティがないエラーを修正
    // データにicon_nameがない場合はデフォルト値を設定
    return data.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      created_at: item.created_at,
      created_by: item.created_by,
      // icon_nameプロパティを追加
      icon_name: "tag" // デフォルトのアイコン名
    }));
  } catch (error) {
    console.error("Error in getContentInfo:", error);
    return [];
  }
}

// コンテンツ情報を更新する
export async function updateContentInfo(id: number, updates: Partial<ContentInfo>): Promise<ContentInfo | null> {
  try {
    const { data, error } = await supabase
      .from("content_names")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating content info:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in updateContentInfo:", error);
    return null;
  }
}

// コンテンツ情報を削除する
export async function deleteContentInfo(id: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("content_names")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting content info:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteContentInfo:", error);
    return false;
  }
}

// 新しいコンテンツ情報を追加する
export async function addContentInfo(newContent: Omit<ContentInfo, 'id' | 'created_at' | 'created_by'>): Promise<ContentInfo | null> {
  try {
    const { data, error } = await supabase
      .from("content_names")
      .insert([newContent])
      .select()
      .single();

    if (error) {
      console.error("Error adding content info:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in addContentInfo:", error);
    return null;
  }
}
