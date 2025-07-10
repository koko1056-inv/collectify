import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TagUpdate } from "@/types/tag";
import { setItemContent } from "@/utils/tag/content-operations";
import { SimpleItemTag } from "@/utils/tag/types";

export function useTagSubmit(
  itemIds: string[],
  isUserItem: boolean,
  onClose: () => void,
  onSubmit?: (updates: TagUpdate[]) => Promise<void>
) {
  const queryClient = useQueryClient();

  const handleSubmit = useCallback(async (
    pendingUpdates: TagUpdate[],
    contentName: string | null,
    currentTags: SimpleItemTag[]
  ) => {
    try {
      console.log('[TagManage] Starting save process');
      console.log('[TagManage] Content name:', contentName);
      console.log('[TagManage] Pending updates:', JSON.stringify(pendingUpdates, null, 2));
      console.log('[TagManage] Item IDs:', itemIds);
      console.log('[TagManage] Current tags:', currentTags);
      
      // コンテンツ名を更新
      let contentUpdateSuccess = true;
      for (const itemId of itemIds) {
        console.log(`[TagManage] Updating content for item: ${itemId}`);
        const success = await setItemContent(itemId, contentName, isUserItem);
        if (!success) {
          console.error(`[TagManage] Failed to update content for item: ${itemId}`);
          contentUpdateSuccess = false;
        }
      }
      
      if (!contentUpdateSuccess) {
        throw new Error("Failed to update content name");
      }
      
      // コンテンツ関連のクエリを無効化
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["item-content"] }),
        queryClient.invalidateQueries({ queryKey: ["items-content"] }),
        isUserItem 
          ? queryClient.invalidateQueries({ queryKey: ["user-items"] })
          : queryClient.invalidateQueries({ queryKey: ["official-items"] })
      ]);
      
      // タグ更新を実行
      if (onSubmit) {
        // null、undefined、空文字列をフィルタリング
        const filteredUpdates = pendingUpdates.filter((u) => u.value !== null && u.value !== undefined && u.value !== '');
        console.log('[TagManage] Calling onSubmit with updates:', filteredUpdates);
        console.log('[TagManage] onSubmit function exists:', !!onSubmit);
        console.log('[TagManage] All pending updates before filtering:', pendingUpdates);
        
        // タグ更新が1つでもある場合は実行
        if (filteredUpdates.length > 0) {
          console.log('[TagManage] Executing onSubmit with filtered updates');
          await onSubmit(filteredUpdates);
          console.log('[TagManage] onSubmit completed successfully');
        } else {
          console.log('[TagManage] No valid updates to submit (all values are null/empty)');
          console.log('[TagManage] Raw pending updates were:', JSON.stringify(pendingUpdates, null, 2));
        }
      } else {
        console.log('[TagManage] onSubmit function not provided');
        console.log('[TagManage] Warning: Tags will not be saved without onSubmit function!');
      }
      
      console.log('[TagManage] Save process completed successfully');
      onClose();
    } catch (error) {
      console.error("[TagManage] Error updating items:", error);
      throw error; // エラーを再スローして上位で処理できるようにする
    }
  }, [itemIds, isUserItem, onClose, onSubmit, queryClient]);

  return { handleSubmit };
}