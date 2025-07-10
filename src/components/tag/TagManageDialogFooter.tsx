
import { Button } from "@/components/ui/button";
import { useState } from "react";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) {
      console.log('[TagManageDialogFooter] Submit already in progress, ignoring');
      return;
    }

    try {
      console.log('[TagManageDialogFooter] Starting submit process');
      setIsSubmitting(true);
      await onSubmit();
      console.log('[TagManageDialogFooter] Submit completed successfully');
    } catch (error) {
      console.error('[TagManageDialogFooter] Submit failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-end gap-2 pt-4 border-t">
      <Button
        variant="outline"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        キャンセル
      </Button>
      
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? '保存中...' : (itemCount > 1 ? `${itemCount}件のアイテムを更新` : '保存')}
      </Button>
    </div>
  );
}
