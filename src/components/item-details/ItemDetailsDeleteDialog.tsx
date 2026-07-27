
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { deleteUserItem } from "@/utils/tag/user-item-operations";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();

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
        title: t("itemDetails.remove.success"),
        description: t("itemDetails.remove.successDescription"),
      });
      onCloseModal();
    } catch (error) {
      toast({
        title: t("itemDetails.common.error"),
        description: t("itemDetails.remove.failed"),
        variant: "destructive",
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
