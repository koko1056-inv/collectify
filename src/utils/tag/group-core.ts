
import { supabase } from "@/integrations/supabase/client";
import { GroupInfo } from "./types";

// ユーザーのグループを取得
export async function getUserGroups(userId: string): Promise<GroupInfo[]> {
  try {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching user groups:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in getUserGroups:", error);
    return [];
  }
}

// 新しいグループを作成
export async function createGroup(
  userId: string,
  name: string,
  description?: string
): Promise<GroupInfo | null> {
  try {
    const newGroup = {
      name,
      description,
      created_by: userId
    };
    
    const { data, error } = await supabase
      .from("groups")
      .insert(newGroup)
      .select()
      .single();
    
    if (error) {
      console.error("Error creating group:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error in createGroup:", error);
    return null;
  }
}
