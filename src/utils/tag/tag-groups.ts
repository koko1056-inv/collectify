
import { supabase } from "@/integrations/supabase/client";
// addItemToGroup のインポートを削除し、独自実装にリネームして競合を解決します
import { TagGroupedItems, GroupInfo } from "./types";

/**
 * タグでグループ化されたアイテムを取得する関数
 * @param userId ユーザーID
 * @returns タグでグループ化されたアイテムリスト
 */
export async function getItemsGroupedByTag(
  userId: string
): Promise<TagGroupedItems> {
  try {
    // ユーザーのアイテムを取得
    const { data: items, error: itemsError } = await supabase
      .from("user_items")
      .select(`
        *,
        user_item_tags (
          tag_id,
          tags (
            id,
            name,
            category
          )
        )
      `)
      .eq("user_id", userId);

    if (itemsError) {
      console.error("Error fetching user items:", itemsError);
      return {};
    }

    if (!items || items.length === 0) {
      return {};
    }

    // タグでグループ化
    const groupedItems: TagGroupedItems = {};
    
    items.forEach((item) => {
      if (item.user_item_tags && item.user_item_tags.length > 0) {
        item.user_item_tags.forEach((tagItem: any) => {
          if (tagItem.tags && tagItem.tags.name) {
            const tagName = tagItem.tags.name;
            if (!groupedItems[tagName]) {
              groupedItems[tagName] = [];
            }
            
            // 同じアイテムが既に追加されていないか確認
            const isDuplicate = groupedItems[tagName].some(
              (existingItem) => existingItem.id === item.id
            );
            
            if (!isDuplicate) {
              groupedItems[tagName].push(item);
            }
          }
        });
      }
    });

    return groupedItems;
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
    
    // 既にグループ内にあるアイテムを確認（一括で取得して効率化）
    const { data: existingMembers, error: existingError } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .in("user_id", itemIds);
      
    if (existingError) {
      console.error("Error checking existing items:", existingError);
      return false;
    }
    
    // 既に追加済みのアイテムIDのセットを作成
    const existingItemIds = new Set(existingMembers?.map(item => item.user_id) || []);
    
    // 追加されていないアイテムのみをフィルタリング
    const itemsToAdd = itemIds.filter(id => !existingItemIds.has(id));
    
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

/**
 * 利用可能なグループ一覧を取得する関数
 * @param userId ユーザーID
 * @returns 利用可能なグループ一覧
 */
export async function getAvailableGroups(userId: string): Promise<GroupInfo[]> {
  try {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching available groups:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in getAvailableGroups:", error);
    return [];
  }
}

/**
 * 単一アイテムをグループに追加する関数 (名前を変更して競合を避ける)
 * @param groupId グループID
 * @param itemId アイテムID
 * @returns 成功したかどうか
 */
export async function addSingleItemToGroup(
  groupId: string,
  itemId: string
): Promise<boolean> {
  return await addItemsToGroup(groupId, [itemId]);
}
