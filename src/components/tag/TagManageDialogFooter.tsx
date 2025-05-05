
import { Button } from "@/components/ui/button";

interface TagManageDialogFooterProps {
  onCancel: () => void;
  onSubmit: () => Promise<void>;
  itemCount?: number;
}

export function TagManageDialogFooter({ 
  onCancel, 
  onSubmit,
  itemCount = 1
}: TagManageDialogFooterProps) {
  return (
    <div className="flex justify-end gap-2 pt-4 border-t">
      <Button
        variant="outline"
        onClick={onCancel}
      >
        キャンセル
      </Button>
      
      <Button
        onClick={onSubmit}
      >
        {itemCount > 1 ? `${itemCount}件のアイテムを更新` : '保存'}
      </Button>
    </div>
  );
}
