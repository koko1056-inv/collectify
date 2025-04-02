import { supabase } from "@/integrations/supabase/client";
import { addItemToGroup } from "./group-items";

/**
 * タグでグループ化されたアイテムを取得する関数
 * @param userId ユーザーID
 * @param tag タグ
 * @returns タグでグループ化されたアイテムリスト
 */
export async function getItemsGroupedByTag(
  userId: string,
  tag: string
): Promise<Record<string, any[]>> {
  try {
    // ユーザーのアイテムを取得
    const { data: items, error: itemsError } = await supabase
      .from("user_items")
      .select("*")
      .eq("created_by", userId);

    if (itemsError) {
      console.error("Error fetching user items:", itemsError);
      return {};
    }

    // タグでフィルタリング
    const filteredItems = items?.filter((item) => {
      // item.tags が存在し、その中に指定されたタグが存在するか確認
      return item.tags && item.tags.some((t: any) => t.name === tag);
    }) || [];

    // タグでグループ化されたアイテムを返す
    return { [tag]: filteredItems };
  } catch (error) {
    console.error("Error in getItemsGroupedByTag:", error);
    return {};
  }
}

/**
 * 複数のアイテムをグループに追加する関数
 * @param groupId グループID
 * @param itemIds 追加するアイテムIDのリスト
 * @returns 成功したかどうか
 */
export async function addItemsToGroup(
  groupId: string,
  itemIds: string[]
): Promise<boolean> {
  console.log("Adding multiple items to group:", itemIds.length, "items to group:", groupId);
  
  try {
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
    
    // 既に追加されているアイテムを確認
    const { data: existingItems, error: existingError } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .in("user_id", itemIds);
      
    if (existingError) {
      console.error("Error checking existing items:", existingError);
      return false;
    }
    
    // 既に追加済みのアイテムIDを抽出
    const existingItemIds = existingItems?.map(item => item.user_id) || [];
    
    // 追加されていないアイテムのみをフィルタリング
    const itemsToAdd = itemIds.filter(id => !existingItemIds.includes(id));
    
    if (itemsToAdd.length === 0) {
      console.log("All items are already in the group");
      return true;
    }
    
    // 一括で追加するためのデータを作成
    const groupMembers = itemsToAdd.map(itemId => ({
      group_id: groupId,
      user_id: itemId,
      role: 'member'
    }));
    
    // 一括でアイテムを追加
    const { error: insertError } = await supabase
      .from("group_members")
      .insert(groupMembers);
    
    if (insertError) {
      console.error("Error adding items to group:", insertError);
      return false;
    }
    
    console.log("Successfully added", itemsToAdd.length, "items to group");
    return true;
  } catch (error) {
    console.error("Error in addItemsToGroup:", error);
    return false;
  }
}
