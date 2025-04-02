
import { supabase } from "@/integrations/supabase/client";

// グループの色を更新する
export async function updateGroupColor(
  groupId: string,
  color: string
): Promise<boolean> {
  try {
    console.log("Updating group color in DB:", groupId, color);
    
    // 認証されたユーザー情報の確認
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error("Error getting authenticated user:", userError);
      return false;
    }
    
    const userId = userData.user?.id;
    if (!userId) {
      console.error("No authenticated user found");
      return false;
    }
    
    // グループの所有者を確認
    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .select("created_by")
      .eq("id", groupId)
      .single();
    
    if (groupError) {
      console.error("Error checking group ownership:", groupError);
      return false;
    }
    
    if (groupData.created_by !== userId) {
      console.error("User does not own this group");
      return false;
    }
    
    // テーブル構造に合わせて更新データを作成
    const updateData = { color_code: color }; // color_code フィールドに変更
    
    // グループ情報を更新
    const { error } = await supabase
      .from("groups")
      .update(updateData)
      .eq("id", groupId);
      
    if (error) {
      console.error("Error updating group color:", error);
      return false;
    }
    
    console.log("Group color successfully updated");
    return true;
  } catch (error) {
    console.error("Error in updateGroupColor:", error);
    return false;
  }
}
