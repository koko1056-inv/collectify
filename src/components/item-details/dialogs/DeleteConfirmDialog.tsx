
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  isSaving: boolean;
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  isSaving
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <h2 className="text-lg font-bold mb-2">アイテムの削除</h2>
        <p className="mb-4">「{title}」をコレクションから削除しますか？</p>
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            キャンセル
          </Button>
          <Button 
            variant="destructive"
            onClick={onConfirm}
            disabled={isSaving}
          >
            削除する
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
