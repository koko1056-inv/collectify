
import { supabase } from "@/integrations/supabase/client";
import { TagGroupedItems, GroupInfo, ApiResponse } from "./types";

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
 * @returns APIレスポンス
 */
export async function addItemsToGroup(
  groupId: string,
  itemIds: string[]
): Promise<ApiResponse> {
  console.log("Adding multiple items to group:", itemIds.length, "items to group:", groupId);
  
  if (!itemIds.length) {
    return { success: false, message: "アイテムIDが指定されていません" };
  }

  try {
    // 認証されたユーザー情報の確認
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error("Error getting authenticated user:", userError);
      return { success: false, message: "ユーザー認証に失敗しました" };
    }
    
    const userId = userData.user?.id;
    if (!userId) {
      console.error("No authenticated user found");
      return { success: false, message: "ユーザーが認証されていません" };
    }
    
    // グループの所有者を確認
    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .select("created_by")
      .eq("id", groupId)
      .single();
    
    if (groupError) {
      console.error("Error checking group ownership:", groupError);
      return { success: false, message: "グループ情報の取得に失敗しました" };
    }
    
    if (groupData.created_by !== userId) {
      console.error("User does not own this group");
      return { success: false, message: "このグループを編集する権限がありません" };
    }
    
    // 既に追加されているアイテムを確認（バッチ処理で効率化）
    const { data: existingMembers, error: existingError } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .in("user_id", itemIds);
      
    if (existingError) {
      console.error("Error checking existing items:", existingError);
      return { success: false, message: "既存アイテムのチェックに失敗しました" };
    }
    
    // 既に追加済みのアイテムIDのセットを作成
    const existingItemIds = new Set(existingMembers?.map(item => item.user_id) || []);
    
    // 追加されていないアイテムのみをフィルタリング
    const itemsToAdd = itemIds.filter(id => !existingItemIds.has(id));
    
    if (itemsToAdd.length === 0) {
      console.log("All items are already in the group");
      return { success: true, message: "すべてのアイテムは既にグループに追加されています" };
    }
    
    // 追加するアイテムが実際にユーザーのアイテムであることを確認
    const { data: userItemsCheck, error: userItemsError } = await supabase
      .from("user_items")
      .select("id")
      .in("id", itemsToAdd)
      .eq("user_id", userId);
    
    if (userItemsError) {
      console.error("Error verifying user items:", userItemsError);
      return { success: false, message: "アイテム所有権の確認に失敗しました" };
    }
    
    // ユーザーが所有するアイテムIDのセット
    const verifiedItemIds = new Set(userItemsCheck?.map(item => item.id) || []);
    
    // 確認済みのアイテムのみを追加
    const verifiedItemsToAdd = itemsToAdd.filter(id => verifiedItemIds.has(id));
    
    if (verifiedItemsToAdd.length === 0) {
      console.error("No verified items to add");
      return { success: false, message: "追加できる有効なアイテムがありません" };
    }
    
    // 一括で追加するためのデータを作成
    const groupMembers = verifiedItemsToAdd.map(itemId => ({
      group_id: groupId,
      user_id: itemId,
      role: 'member'
    }));
    
    // RLSを回避するためサービスロールを使用したクライアントで実行（別の方法も検討可能）
    // 一括でアイテムを追加
    const { error: insertError } = await supabase
      .from("group_members")
      .insert(groupMembers);
    
    if (insertError) {
      console.error("Error adding items to group:", insertError);
      return { 
        success: false, 
        message: "グループへのアイテム追加に失敗しました",
        data: { error: insertError }
      };
    }
    
    console.log("Successfully added", verifiedItemsToAdd.length, "items to group");
    return { 
      success: true, 
      message: `${verifiedItemsToAdd.length}個のアイテムをグループに追加しました`,
      data: { addedCount: verifiedItemsToAdd.length }
    };
  } catch (error) {
    console.error("Error in addItemsToGroup:", error);
    return { 
      success: false, 
      message: "処理中にエラーが発生しました",
      data: { error }
    };
  }
}

/**
 * 単一アイテムをグループに追加する関数
 * @param groupId グループID
 * @param itemId アイテムID
 * @returns APIレスポンス
 */
export async function addSingleItemToGroup(
  groupId: string,
  itemId: string
): Promise<ApiResponse> {
  return await addItemsToGroup(groupId, [itemId]);
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
