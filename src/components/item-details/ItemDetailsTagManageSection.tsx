
import { useQueryClient } from "@tanstack/react-query";
import { addTagToItem, removeTagFromItem } from "@/utils/tag/tag-mutations";
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
      console.log(`Processing ${updates.length} tag updates for item ${itemId}`);
      
      // 各更新を処理
      for (const update of updates) {
        const { category, value } = update;
        
        if (value) {
          // タグを追加
          const result = await addTagToItem(itemId, value, isUserItem);
          if (result) {
            console.log(`Added tag ${value} (${category}) to item ${itemId}`);
          }
        }
      }
      
      // 関連するクエリを無効化してデータを再取得
      await queryClient.invalidateQueries({ queryKey: ["current-tags", [itemId]] });
      await queryClient.invalidateQueries({ queryKey: ["user-items"] });
      await queryClient.invalidateQueries({ queryKey: ["item-tags", itemId] });
      
      toast({
        title: "タグを更新しました",
        description: "タグの変更が保存されました。",
      });
    } catch (error) {
      console.error("Error updating tags:", error);
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
