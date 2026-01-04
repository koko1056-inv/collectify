import { supabase } from "@/integrations/supabase/client";
import { findTagIdByName } from "./tag-search";
import { TagUpdate } from "@/types/tag";

/**
 * アイテムにタグを追加する関数
 */
export async function addTagToItem(
  itemId: string,
  tagNameOrId: string,
  isUserItem: boolean = false,
  category?: string,
  contentId?: string | null
): Promise<boolean> {
  try {
    // タグ名の場合はタグIDを検索
    let tagId = tagNameOrId;
    
    // タグ名かIDかを判定（UUIDの形式かどうかで判断）
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tagNameOrId);
    
    if (!isUuid) {
      const foundTagId = await findTagIdByName(tagNameOrId, category, contentId);
      if (!foundTagId) {
        console.error(`[addTagToItem] Tag with name "${tagNameOrId}" not found`);
        return false;
      }
      tagId = foundTagId;
    }
    
    const table = isUserItem ? "user_item_tags" : "item_tags";
    const itemField = isUserItem ? "user_item_id" : "official_item_id";
    
    // 既に同じタグが付いているか確認
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
      return true;
    }
    
    // タグを追加
    const insertData = isUserItem 
      ? { user_item_id: itemId, tag_id: tagId }
      : { official_item_id: itemId, tag_id: tagId };
    
    const { error } = await supabase
      .from(table)
      .insert(insertData)
      .select();
    
    if (error) {
      console.error("[addTagToItem] Error adding tag to item:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("[addTagToItem] Exception:", error);
    return false;
  }
}

/**
 * アイテムからタグを削除する関数
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
 */
export async function updateTagsForMultipleItems(
  itemIds: string[],
  updates: TagUpdate[],
  isUserItem: boolean = false,
  currentTags: any[] = []
): Promise<boolean> {
  try {
    if (itemIds.length === 0 || updates.length === 0) {
      return true;
    }
    
    let allSuccess = true;
    
    // 各アイテムに対して各更新を適用
    for (const itemId of itemIds) {
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
      
      for (const update of updates) {
        try {
          // 同じカテゴリの既存タグをすべて削除
          const itemTagTable = isUserItem ? 'user_item_tags' : 'item_tags';
          const itemIdField = isUserItem ? 'user_item_id' : 'official_item_id';
          
          // このアイテムの現在のタグを取得
          const { data: existingItemTags } = await supabase
            .from(itemTagTable)
            .select(`id, tag_id, tags(id, name, category)`)
            .eq(itemIdField, itemId);
          
          // 同じカテゴリのタグをすべて削除
          if (existingItemTags) {
            const tagsToDelete = existingItemTags.filter(
              (itemTag: any) => itemTag.tags?.category === update.category
            );
            
            for (const tagToDelete of tagsToDelete) {
              await removeTagFromItem(tagToDelete.tag_id, itemId, isUserItem);
            }
          }
          
          // 新しいタグを追加（値がある場合のみ）
          if (update.value) {
            const addSuccess = await addTagToItem(itemId, update.value, isUserItem, update.category, contentId);
            if (!addSuccess) {
              allSuccess = false;
            }
          }
        } catch (updateError) {
          console.error(`[updateTagsForMultipleItems] Error processing update:`, updateError);
          allSuccess = false;
        }
      }
    }
    
    return allSuccess;
  } catch (error) {
    console.error("[updateTagsForMultipleItems] Exception:", error);
    return false;
  }
}
