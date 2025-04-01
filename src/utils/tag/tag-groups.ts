import { supabase } from "@/integrations/supabase/client";
import { GroupInfo } from "./types";

// ユーザーのグループ一覧を取得
export async function getUserGroups(userId: string): Promise<GroupInfo[]> {
  try {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .eq("user_id", userId)
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

// グループにアイテムを追加
export async function addItemsToGroup(
  groupId: string,
  itemIds: string[]
): Promise<boolean> {
  try {
    // 既存の関連付けを削除
    const { error: deleteError } = await supabase
      .from("group_items")
      .delete()
      .eq("group_id", groupId)
      .in("item_id", itemIds);

    if (deleteError) {
      console.error("Error deleting existing group items:", deleteError);
      return false;
    }

    // 新しい関連付けを挿入
    const groupItems = itemIds.map((itemId) => ({
      group_id: groupId,
      item_id: itemId,
    }));

    const { error: insertError } = await supabase
      .from("group_items")
      .insert(groupItems);

    if (insertError) {
      console.error("Error adding items to group:", insertError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in addItemsToGroup:", error);
    return false;
  }
}

// グループからアイテムを削除
export async function removeItemsFromGroup(
  groupId: string,
  itemIds: string[]
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("group_items")
      .delete()
      .eq("group_id", groupId)
      .in("item_id", itemIds);

    if (error) {
      console.error("Error removing items from group:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in removeItemsFromGroup:", error);
    return false;
  }
}

// グループのアイテム一覧を取得
export async function getGroupItems(groupId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("group_items")
      .select("item_id")
      .eq("group_id", groupId);

    if (error) {
      console.error("Error fetching group items:", error);
      return [];
    }

    // アイテムIDの配列を取得
    const itemIds = data.map((item) => item.item_id);

    // アイテムIDに基づいてアイテム情報を取得
    if (itemIds.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from("user_items")
        .select("*")
        .in("id", itemIds);

      if (itemsError) {
        console.error("Error fetching item details:", itemsError);
        return [];
      }

      return itemsData || [];
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error in getGroupItems:", error);
    return [];
  }
}

// グループのアイテム数を取得
export async function getGroupItemCount(groupId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("group_items")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (error) {
      console.error("Error fetching group item count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Error in getGroupItemCount:", error);
    return 0;
  }
}
