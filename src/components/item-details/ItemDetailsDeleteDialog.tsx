
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { deleteUserItem } from "@/utils/tag/user-item-operations";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { invalidateCollectionChanged } from "@/utils/collection-cache";

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
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { user: authUser } = useAuth();

  const handleDelete = async () => {
    if (!isUserItem || !itemId) return;

    try {
      const { error, officialItemId } = await deleteUserItem(itemId);
      if (error) throw error;

      // コレクションから計算している数字（コンプ進捗・登録数など）をまとめて引き直す。
      // 以前は ["user-items"] などしか引き直しておらず、削除してもコンプ進捗・登録数が古いまま残った
      void invalidateCollectionChanged(queryClient, { userId: authUser?.id ?? user?.id, officialItemId });
      toast.success(t("itemDetails.remove.success"), {
        description: t("itemDetails.remove.successDescription"),
      });
      onCloseModal();
    } catch (error) {
      // 交換が成立して進行中の品は、サーバーが削除を止める
      const inTrade = JSON.stringify(error ?? "").includes("trade_in_progress");
      toast.error(t("itemDetails.common.error"), {
        description: inTrade ? t("trade.errors.itemInTrade") : t("itemDetails.remove.failed"),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <h2 className="text-lg font-bold mb-2">{t("itemDetails.remove.title")}</h2>
        <p className="mb-4">{t("itemDetails.remove.confirm", { title })}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("itemDetails.common.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            {t("itemDetails.remove.confirmButton")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
