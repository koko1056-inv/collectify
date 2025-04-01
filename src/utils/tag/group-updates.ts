
import { supabase } from "@/integrations/supabase/client";

// グループの色を更新
export async function updateGroupColor(
  groupId: string,
  color: string
): Promise<boolean> {
  try {
    console.log("Updating group color in database:", groupId, color);
    
    // groupsテーブルを更新する際にcolorカラムを明示的に指定
    const { error } = await supabase
      .from("groups")
      .update({ color: color }) // このように明示的に指定
      .eq("id", groupId);
    
    if (error) {
      console.error("Error updating group color:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in updateGroupColor:", error);
    return false;
  }
}

// その他のグループ更新関連の関数はここに追加
