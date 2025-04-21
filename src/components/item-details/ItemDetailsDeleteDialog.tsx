
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { deleteUserItem } from "@/utils/tag/user-item-operations";
import { useQueryClient } from "@tanstack/react-query";

interface ItemDetailsDeleteDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  itemId: string;
  isUserItem: boolean;
  onCloseModal: () => void;
  userId?: string;
  user?: any;
}

export function ItemDetailsDeleteDialog({
  open,
  setOpen,
  title,
  itemId,
  isUserItem,
  onCloseModal,
  userId,
  user,
}: ItemDetailsDeleteDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (!isUserItem || !itemId) return;

    try {
      const { error, officialItemId } = await deleteUserItem(itemId);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["user-items"] });
      if (officialItemId) {
        queryClient.invalidateQueries({ queryKey: ["user-item-exists", officialItemId, user?.id] });
        queryClient.invalidateQueries({ queryKey: ["item-owners-count", officialItemId] });
      }
      toast({
        title: "アイテムを削除しました",
        description: "コレクションからアイテムを削除しました。",
      });
      onCloseModal();
    } catch (error) {
      toast({
        title: "エラー",
        description: "アイテムの削除に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <h2 className="text-lg font-bold mb-2">アイテムの削除</h2>
        <p className="mb-4">「{title}」をコレクションから削除しますか？</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
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
