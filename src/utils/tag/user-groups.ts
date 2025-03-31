
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
export async function createGroup(groupData: {
  name: string;
  description?: string;
  created_by: string;
}): Promise<GroupInfo | null> {
  try {
    const { data, error } = await supabase
      .from("groups")
      .insert(groupData)
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

// グループにアイテムを追加
export async function addItemToGroup(
  groupId: string,
  itemId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("group_members")
      .insert({
        group_id: groupId,
        user_id: itemId
      });
    
    if (error) {
      console.error("Error adding item to group:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in addItemToGroup:", error);
    return false;
  }
}

// グループからアイテムを削除
export async function removeItemFromGroup(
  groupId: string,
  itemId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("group_members")
      .delete()
      .match({
        group_id: groupId,
        user_id: itemId
      });
    
    if (error) {
      console.error("Error removing item from group:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in removeItemFromGroup:", error);
    return false;
  }
}

// グループに所属するアイテムを取得
export async function getGroupItems(groupId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("group_members")
      .select(`
        user_items:user_id (
          id, 
          title, 
          image,
          quantity
        )
      `)
      .eq("group_id", groupId);
    
    if (error) {
      console.error("Error fetching group items:", error);
      return [];
    }
    
    // データを変換
    const items = data
      .filter(item => item.user_items)
      .map(item => item.user_items);
    
    return items;
  } catch (error) {
    console.error("Error in getGroupItems:", error);
    return [];
  }
}

// グループの中にアイテムがあるか確認
export async function isItemInGroup(
  groupId: string,
  itemId: string
): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from("group_members")
      .select("*", { count: 'exact', head: true })
      .eq("group_id", groupId)
      .eq("user_id", itemId);
    
    if (error) {
      console.error("Error checking if item is in group:", error);
      return false;
    }
    
    return (count || 0) > 0;
  } catch (error) {
    console.error("Error in isItemInGroup:", error);
    return false;
  }
}

// グループのアイテム数を取得
export async function getGroupItemCount(groupId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("group_members")
      .select("*", { count: 'exact', head: true })
      .eq("group_id", groupId);
    
    if (error) {
      console.error("Error getting group item count:", error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error("Error in getGroupItemCount:", error);
    return 0;
  }
}
