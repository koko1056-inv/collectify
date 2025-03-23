
import { Button } from "@/components/ui/button";

interface TagManageDialogFooterProps {
  onCancel: () => void;
  onSubmit: () => void;
  isLoading?: boolean;
}

export function TagManageDialogFooter({ 
  onCancel, 
  onSubmit,
  isLoading = false
}: TagManageDialogFooterProps) {
  return (
    <div className="flex justify-end gap-2 pt-4">
      <Button variant="outline" onClick={onCancel} disabled={isLoading}>
        キャンセル
      </Button>
      <Button onClick={onSubmit} disabled={isLoading}>
        保存
      </Button>
    </div>
  );
}
