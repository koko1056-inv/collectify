import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface ItemDetailsFooterProps {
  isEditing: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
  onEdit: () => void;
  showEditButton?: boolean;
}

export function ItemDetailsFooter({
  isEditing,
  isSaving,
  onCancel,
  onSave,
  onEdit,
  showEditButton = true,
}: ItemDetailsFooterProps) {
  const { t } = useLanguage();
  return (
    <div className="flex justify-end space-x-2 pt-4 border-t">
      {isEditing ? (
        <>
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={isSaving}
          >
            {t("itemDetails.common.cancel")}
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? t("itemDetails.common.saving") : t("itemDetails.common.save")}
          </Button>
        </>
      ) : (
        showEditButton && <Button onClick={onEdit}>{t("itemDetails.common.edit")}</Button>
      )}
    </div>
  );
}