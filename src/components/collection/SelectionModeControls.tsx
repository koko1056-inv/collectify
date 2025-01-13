import { Button } from "@/components/ui/button";

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
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSelectAll}
        >
          {selectedItems.length === totalItems ? "選択解除" : "全て選択"}
        </Button>
        <span className="text-sm text-muted-foreground">
          {selectedItems.length}個選択中
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={onConfirm}
          disabled={selectedItems.length === 0}
        >
          確定
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
        >
          キャンセル
        </Button>
      </div>
    </div>
  );
}