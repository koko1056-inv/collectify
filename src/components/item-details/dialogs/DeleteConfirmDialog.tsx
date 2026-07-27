
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <h2 className="text-lg font-bold mb-2">{t("itemDetails.remove.title")}</h2>
        <p className="mb-4">{t("itemDetails.remove.confirm", { title })}</p>
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            {t("itemDetails.common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isSaving}
          >
            {t("itemDetails.remove.confirmButton")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
