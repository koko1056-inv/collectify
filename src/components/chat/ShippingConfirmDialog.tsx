
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";

interface ShippingConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ShippingConfirmDialog({ 
  isOpen, 
  onOpenChange, 
  onConfirm 
}: ShippingConfirmDialogProps) {
  const { t } = useLanguage();

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("social.chat.shippingConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("social.chat.shippingConfirmDesc")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("social.chat.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {t("social.chat.shippingConfirmAction")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
