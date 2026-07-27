import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface SelectionModeControlsProps {
  selectedItems: string[];
  totalItems: number;
  onSelectAll: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SelectionModeControls({
  selectedItems,
  totalItems,
  onSelectAll,
  onConfirm,
  onCancel,
}: SelectionModeControlsProps) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSelectAll}
        >
          {selectedItems.length === totalItems ? t("collectionScreen.selection.deselectAll") : t("collectionScreen.selection.selectAll")}
        </Button>
        <span className="text-sm text-muted-foreground">
          {selectedItems.length}{t("collectionScreen.selection.selectedSuffix")}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={onConfirm}
          disabled={selectedItems.length === 0}
        >
          {t("collectionScreen.selection.confirm")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
        >
          {t("collectionScreen.common.cancel")}
        </Button>
      </div>
    </div>
  );
}