
import { supabase } from "@/integrations/supabase/client";
import { findTagIdByName } from "./tag-search";
import { TagUpdate } from "@/types/tag";

/**
 * アイテムにタグを追加する関数
 * @param itemId アイテムID
 * @param tagNameOrId タグ名またはタグID
 * @param isUserItem ユーザーアイテムかどうか
 * @returns 処理結果
 */
export async function addTagToItem(
  itemId: string,
  tagNameOrId: string,
  isUserItem: boolean = false,
  category?: string,
  contentId?: string | null
): Promise<boolean> {
  try {
    console.log(`[addTagToItem] =====START=====`);
    console.log(`[addTagToItem] itemId: ${itemId}`);
    console.log(`[addTagToItem] tagNameOrId: ${tagNameOrId}`);
    console.log(`[addTagToItem] isUserItem: ${isUserItem}`);
    console.log(`[addTagToItem] category: ${category}`);
    console.log(`[addTagToItem] contentId: ${contentId}`);
    
    // タグ名の場合はタグIDを検索
    let tagId = tagNameOrId;
    
    // タグ名かIDかを判定（UUIDの形式かどうかで判断）
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tagNameOrId);
    console.log(`[addTagToItem] Is UUID: ${isUuid}`);
    
    if (!isUuid) {
      console.log(`[addTagToItem] Looking up tag ID for name: ${tagNameOrId}`);
      const foundTagId = await findTagIdByName(tagNameOrId, category, contentId);
      if (!foundTagId) {
        console.error(`[addTagToItem] Tag with name "${tagNameOrId}" not found`);
        return false;
      }
      tagId = foundTagId;
      console.log(`[addTagToItem] Found tag ID: ${tagId}`);
    }
    
    const table = isUserItem ? "user_item_tags" : "item_tags";
    const itemField = isUserItem ? "user_item_id" : "official_item_id";
    
    console.log(`[addTagToItem] Using table: ${table}, itemField: ${itemField}`);
    
    // 既に同じタグが付いているか確認
    console.log(`[addTagToItem] Checking for existing tag`);
    const { data: existingTag, error: checkError } = await supabase
      .from(table)
      .select("id")
      .eq(itemField, itemId)
      .eq("tag_id", tagId)
      .maybeSingle();
    
    if (checkError) {
      console.error("[addTagToItem] Error checking existing tag:", checkError);
      return false;
    }
    
    // 既に同じタグが存在する場合は何もしない
    if (existingTag) {
      console.log(`[addTagToItem] Tag ${tagId} already exists for item ${itemId}`);
      return true;
    }
    
    // タグを追加 - 正しい型で明示的にオブジェクトを作成
    const insertData = isUserItem 
      ? { user_item_id: itemId, tag_id: tagId }
      : { official_item_id: itemId, tag_id: tagId };
    
    console.log(`[addTagToItem] Inserting data:`, insertData);
    
    const { data: insertResult, error } = await supabase
      .from(table)
      .insert(insertData)
      .select();
    
    if (error) {
      console.error("[addTagToItem] Error adding tag to item:", error);
      return false;
    }
    
    console.log(`[addTagToItem] Successfully added tag. Insert result:`, insertResult);
    return true;
  } catch (error) {
    console.error("[addTagToItem] Exception:", error);
    return false;
  }
}

/**
 * アイテムからタグを削除する関数
 * @param tagId タグID
 * @param itemId アイテムID
 * @param isUserItem ユーザーアイテムかどうか
 * @returns 処理結果
 */
export async function removeTagFromItem(
  tagId: string,
  itemId: string,
  isUserItem: boolean = false
): Promise<boolean> {
  try {
    const table = isUserItem ? "user_item_tags" : "item_tags";
    const idField = isUserItem ? "user_item_id" : "official_item_id";
    
    const { error } = await supabase
      .from(table)
      .delete()
      .eq(idField, itemId)
      .eq("tag_id", tagId);
    
    if (error) {
      console.error("Error removing tag from item:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in removeTagFromItem:", error);
    return false;
  }
}

/**
 * 複数のアイテムに対して一括でタグ更新を適用する関数
 * @param itemIds アイテムIDの配列
 * @param updates タグ更新の配列
 * @param isUserItem ユーザーアイテムかどうか
 * @param currentTags 現在のタグ（削除用）
 */
export async function updateTagsForMultipleItems(
  itemIds: string[],
  updates: TagUpdate[],
  isUserItem: boolean = false,
  currentTags: any[] = []
): Promise<boolean> {
  try {
    if (itemIds.length === 0) {
      console.log('[updateTagsForMultipleItems] No items to update');
      return true;
    }
    
    if (updates.length === 0) {
      console.log('[updateTagsForMultipleItems] No tag updates to apply');
      return true;
    }
    
    console.log('[updateTagsForMultipleItems] Starting updates:', { itemIds, updates });
    
    let allSuccess = true;
    
    // 各アイテムに対して各更新を適用
    for (const itemId of itemIds) {
      console.log(`[updateTagsForMultipleItems] Processing item: ${itemId}`);
      
      // アイテムのcontent_idを取得
      const table = isUserItem ? 'user_items' : 'official_items';
      const { data: itemData } = await supabase
        .from(table)
        .select('content_name')
        .eq('id', itemId)
        .single();
      
      let contentId: string | null = null;
      if (itemData?.content_name) {
        const { data: contentData } = await supabase
          .from('content_names')
          .select('id')
          .eq('name', itemData.content_name)
          .single();
        contentId = contentData?.id || null;
      }
      
      console.log(`[updateTagsForMultipleItems] Item ${itemId} content_id: ${contentId}`);
      
      for (const update of updates) {
        console.log(`[updateTagsForMultipleItems] Processing category: ${update.category}, value: ${update.value}`);
        
        try {
          // CRITICAL: 同じカテゴリの既存タグをすべて削除（currentTagsではなく、DBから直接取得して削除）
          const itemTagTable = isUserItem ? 'user_item_tags' : 'item_tags';
          const itemIdField = isUserItem ? 'user_item_id' : 'official_item_id';
          
          // まず、このアイテムの現在のタグを取得
          const { data: existingItemTags } = await supabase
            .from(itemTagTable)
            .select(`id, tag_id, tags(id, name, category)`)
            .eq(itemIdField, itemId);
          
          console.log(`[updateTagsForMultipleItems] Existing tags for item ${itemId}:`, existingItemTags);
          
          // 同じカテゴリのタグをすべて削除
          if (existingItemTags) {
            const tagsToDelete = existingItemTags.filter(
              (itemTag: any) => itemTag.tags?.category === update.category
            );
            
            console.log(`[updateTagsForMultipleItems] Found ${tagsToDelete.length} tags to delete in category ${update.category}`);
            
            for (const tagToDelete of tagsToDelete) {
              console.log(`[updateTagsForMultipleItems] Deleting tag: ${tagToDelete.tags?.name} (${tagToDelete.tag_id})`);
              const removeSuccess = await removeTagFromItem(tagToDelete.tag_id, itemId, isUserItem);
              if (!removeSuccess) {
                console.error(`[updateTagsForMultipleItems] Failed to remove tag ${tagToDelete.tag_id}`);
              } else {
                console.log(`[updateTagsForMultipleItems] Successfully removed tag ${tagToDelete.tag_id}`);
              }
            }
          }
          
          // 新しいタグを追加（値がある場合のみ）
          if (update.value) {
            console.log(`[updateTagsForMultipleItems] Adding new tag: ${update.value}`);
            const addSuccess = await addTagToItem(itemId, update.value, isUserItem, update.category, contentId);
            if (!addSuccess) {
              console.error(`[updateTagsForMultipleItems] Failed to add tag ${update.value}`);
              allSuccess = false;
            } else {
              console.log(`[updateTagsForMultipleItems] Successfully added tag ${update.value}`);
            }
          } else {
            console.log(`[updateTagsForMultipleItems] No value for category ${update.category}, only deletion performed`);
          }
        } catch (updateError) {
          console.error(`[updateTagsForMultipleItems] Error processing update for item ${itemId}, category ${update.category}:`, updateError);
          allSuccess = false;
        }
      }
    }
    
    console.log(`[updateTagsForMultipleItems] Completed. Success: ${allSuccess}`);
    return allSuccess;
  } catch (error) {
    console.error("[updateTagsForMultipleItems] Exception:", error);
    return false;
  }
}
