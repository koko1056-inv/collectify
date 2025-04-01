
import { supabase } from "@/integrations/supabase/client";

// タグでグループ化されたアイテムを取得する
export async function getItemsGroupedByTag(userId: string): Promise<{[key: string]: any[]}> {
  try {
    // ユーザーのアイテムを取得
    const { data: userItems, error: itemsError } = await supabase
      .from("user_items")
      .select("*")
      .eq("user_id", userId);

    if (itemsError) {
      console.error("Error fetching user items:", itemsError);
      return {};
    }

    if (!userItems || userItems.length === 0) {
      return {};
    }

    // アイテムのIDリストを作成
    const itemIds = userItems.map(item => item.id);

    // アイテムに関連するタグを取得
    const { data: itemTags, error: tagsError } = await supabase
      .from("user_item_tags")
      .select(`
        tag_id,
        user_item_id,
        tags (
          id,
          name,
          category
        )
      `)
      .in("user_item_id", itemIds);

    if (tagsError) {
      console.error("Error fetching tags for items:", tagsError);
      return {};
    }

    // タグ名でアイテムをグループ化
    const groupedItems: {[key: string]: any[]} = {};

    for (const item of userItems) {
      // このアイテムに関連するタグを見つける
      const itemTagsFiltered = itemTags.filter(tag => tag.user_item_id === item.id);
      
      if (itemTagsFiltered.length === 0) {
        // タグがない場合は「未分類」に入れる
        if (!groupedItems["未分類"]) {
          groupedItems["未分類"] = [];
        }
        groupedItems["未分類"].push(item);
        continue;
      }

      // 各タグごとにアイテムを追加
      for (const tagRelation of itemTagsFiltered) {
        if (tagRelation.tags) {
          const tagName = tagRelation.tags.name;
          if (!groupedItems[tagName]) {
            groupedItems[tagName] = [];
          }
          
          // 同じアイテムを複数回追加しないようにチェック
          if (!groupedItems[tagName].some(i => i.id === item.id)) {
            groupedItems[tagName].push(item);
          }
        }
      }
    }

    return groupedItems;
  } catch (error) {
    console.error("Error in getItemsGroupedByTag:", error);
    return {};
  }
}

// アイテムをグループに追加（新しく実装）
export async function addItemsToGroup(
  groupId: string,
  itemIds: string[]
): Promise<boolean> {
  try {
    console.log("Adding multiple items to group:", itemIds.length, "items to group", groupId);
    
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
    
    // 各アイテムをグループに追加
    const successfulItems = [];
    const failedItems = [];
    
    for (const itemId of itemIds) {
      // すでに追加済みかチェック
      const { count, error: checkError } = await supabase
        .from("group_members")
        .select("*", { count: 'exact', head: true })
        .eq("group_id", groupId)
        .eq("user_id", itemId);
        
      if (checkError) {
        console.error("Error checking if item is in group:", checkError);
        failedItems.push(itemId);
        continue;
      }
      
      // 既に存在する場合はスキップ
      if (count && count > 0) {
        console.log("Item already in group:", itemId);
        successfulItems.push(itemId); // 既存も成功とみなす
        continue;
      }
      
      // 新しいグループメンバーとして追加
      const { error: insertError } = await supabase
        .from("group_members")
        .insert({
          group_id: groupId,
          user_id: itemId,
          role: 'member'
        });
        
      if (insertError) {
        console.error("Error adding item to group:", insertError, "for item:", itemId);
        failedItems.push(itemId);
      } else {
        console.log("Successfully added item to group:", itemId);
        successfulItems.push(itemId);
      }
    }
    
    console.log(`Add items to group summary: 
      - Success: ${successfulItems.length} items
      - Failed: ${failedItems.length} items`);
    
    return successfulItems.length > 0;
  } catch (error) {
    console.error("Error in addItemsToGroup:", error);
    return false;
  }
}
