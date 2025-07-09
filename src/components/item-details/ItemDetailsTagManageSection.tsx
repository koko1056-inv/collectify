
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
      
      // 更新処理を実行
      console.log('[ItemDetailsTagManage] Calling updateTagsForMultipleItems');
      const success = await updateTagsForMultipleItems([itemId], updates, isUserItem, currentTags);
      console.log('[ItemDetailsTagManage] Update result:', success);
      
      if (success) {
        console.log('[ItemDetailsTagManage] Invalidating queries');
        // 関連するクエリを無効化してデータを再取得
        await queryClient.invalidateQueries({ queryKey: ["current-tags", [itemId]] });
        await queryClient.invalidateQueries({ queryKey: ["user-items"] });
        await queryClient.invalidateQueries({ queryKey: ["item-tags", itemId] });
        console.log('[ItemDetailsTagManage] Queries invalidated');
        
        toast({
          title: "タグを更新しました",
          description: "タグの変更が保存されました。",
        });
      } else {
        throw new Error("Tag update failed");
      }
    } catch (error) {
      console.error("[ItemDetailsTagManage] Error updating tags:", error);
      toast({
        title: "エラー",
        description: "タグの更新中にエラーが発生しました。",
        variant: "destructive",
      });
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
