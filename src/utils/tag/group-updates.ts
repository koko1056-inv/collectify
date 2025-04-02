
import { supabase } from "@/integrations/supabase/client";

// グループを更新する関数
export async function updateGroup(
  groupId: string,
  updates: {
    name?: string;
    description?: string;
    image_url?: string;
  }
): Promise<boolean> {
  try {
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
    
    // グループの更新
    const { error } = await supabase
      .from("groups")
      .update(updates)
      .eq("id", groupId);
      
    if (error) {
      console.error("Error updating group:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in updateGroup:", error);
    return false;
  }
}

// グループを削除する関数
export async function deleteGroup(groupId: string): Promise<boolean> {
  try {
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
    
    // グループメンバーの削除
    const { error: membersError } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId);
      
    if (membersError) {
      console.error("Error deleting group members:", membersError);
      return false;
    }
    
    // グループの削除
    const { error } = await supabase
      .from("groups")
      .delete()
      .eq("id", groupId);
      
    if (error) {
      console.error("Error deleting group:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in deleteGroup:", error);
    return false;
  }
}
