
import { useQueryClient } from "@tanstack/react-query";
import { updateTagsForMultipleItems } from "@/utils/tag/tag-mutations";
import { TagManageModal } from "../tag/TagManageModal";
import { TagUpdate } from "@/types/tag";
import { useToast } from "@/hooks/use-toast";

interface ItemDetailsTagManageSectionProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle?: string;
  isUserItem: boolean;
}

export function ItemDetailsTagManageSection({
  isOpen,
  onClose,
  itemId,
  itemTitle,
  isUserItem,
}: ItemDetailsTagManageSectionProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // タグ更新を処理する関数
  const handleTagUpdates = async (updates: TagUpdate[]) => {
    try {
      console.log('[ItemDetailsTagManage] Starting tag updates');
      console.log('[ItemDetailsTagManage] Updates received:', JSON.stringify(updates, null, 2));
      console.log('[ItemDetailsTagManage] Item ID:', itemId);
      console.log('[ItemDetailsTagManage] Is user item:', isUserItem);
      
      // 現在のタグを取得
      const currentTags = queryClient.getQueryData(["current-tags", [itemId]]) as any[] || [];
      console.log('[ItemDetailsTagManage] Current tags from cache:', currentTags);
      
      // 更新処理を実行（更新がない場合でも必ず成功メッセージを表示）
      let updateSuccess = true;
      
      if (updates.length > 0) {
        console.log('[ItemDetailsTagManage] Processing tag updates');
        updateSuccess = await updateTagsForMultipleItems([itemId], updates, isUserItem, currentTags);
        console.log('[ItemDetailsTagManage] Update result:', updateSuccess);
        
        if (!updateSuccess) {
          throw new Error("Tag update failed");
        }
      } else {
        console.log('[ItemDetailsTagManage] No tag updates to process');
      }
      
      // クエリを無効化して最新データを強制取得
      console.log('[ItemDetailsTagManage] Invalidating all related queries');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["current-tags"] }),
        queryClient.invalidateQueries({ queryKey: ["item-tags"] }),
        queryClient.invalidateQueries({ queryKey: ["tags"] }),
        isUserItem 
          ? queryClient.invalidateQueries({ queryKey: ["user-items"] })
          : queryClient.invalidateQueries({ queryKey: ["official-items"] })
      ]);
      
      // 確実にキャッシュからも削除
      queryClient.removeQueries({ queryKey: ["current-tags", [itemId]] });
      
      console.log('[ItemDetailsTagManage] All queries invalidated');
      
      // 成功メッセージを表示
      toast({
        title: "保存しました",
        description: "設定が保存されました。",
      });
      
    } catch (error) {
      console.error("[ItemDetailsTagManage] Error updating tags:", error);
      toast({
        title: "エラー",
        description: "タグの更新中にエラーが発生しました。",
        variant: "destructive",
      });
      throw error; // エラーを再スローして上位で処理
    }
  };

  return (
    <TagManageModal
      isOpen={isOpen}
      onClose={onClose}
      itemIds={[itemId]}
      itemTitle={itemTitle}
      isUserItem={isUserItem}
      onSubmit={handleTagUpdates}
    />
  );
}
