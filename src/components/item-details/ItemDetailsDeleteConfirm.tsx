
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { deleteUserItem } from "@/utils/tag/user-item-operations";
import { useQueryClient } from "@tanstack/react-query";

interface ItemDetailsDeleteConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  title: string;
  onConfirm: () => void;
}

export function ItemDetailsDeleteConfirm({
  isOpen,
  onClose,
  itemId,
  title,
  onConfirm,
}: ItemDetailsDeleteConfirmProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    try {
      const { error, officialItemId } = await deleteUserItem(itemId);
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["user-items"] });
      if (officialItemId) {
        await queryClient.invalidateQueries({ queryKey: ["item-owners-count", officialItemId] });
      }

      toast({
        title: "アイテムを削除しました",
        description: "コレクションからアイテムを削除しました。",
      });
      onConfirm();
    } catch (error) {
      toast({
        title: "エラー",
        description: "アイテムの削除に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <h2 className="text-lg font-bold mb-2">アイテムの削除</h2>
        <p className="mb-4">「{title}」をコレクションから削除しますか？</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            削除する
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
