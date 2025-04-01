
import { supabase } from "@/integrations/supabase/client";

// グループの色を更新
export async function updateGroupColor(
  groupId: string,
  color: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("groups")
      .update({ color }) // この部分でエラーが発生していました
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
