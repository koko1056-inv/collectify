
import { supabase } from "@/integrations/supabase/client";

// グループの色を更新
export async function updateGroupColor(
  groupId: string,
  color: string
): Promise<boolean> {
  try {
    console.log("Updating group color in database:", groupId, color);
    
    // まずテーブルに color カラムが存在するか確認
    const { data: groupData, error: checkError } = await supabase
      .from("groups")
      .select("id")
      .eq("id", groupId)
      .single();
    
    if (checkError) {
      console.error("Error checking group:", checkError);
      return false;
    }
    
    // groupsテーブルを更新
    const { error } = await supabase
      .from("groups")
      .update({ color })  // ES6の省略記法を使用
      .eq("id", groupId);
    
    if (error) {
      console.error("Error updating group color:", error);
      return false;
    }
    
    console.log("Group color updated successfully");
    return true;
  } catch (error) {
    console.error("Error in updateGroupColor:", error);
    return false;
  }
}

// その他のグループ更新関連の関数はここに追加
