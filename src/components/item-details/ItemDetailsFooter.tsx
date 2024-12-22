import { Button } from "@/components/ui/button";

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
  return (
    <div className="flex justify-end space-x-2 pt-4 border-t">
      {isEditing ? (
        <>
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={isSaving}
          >
            キャンセル
          </Button>
          <Button 
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </>
      ) : (
        showEditButton && <Button onClick={onEdit}>編集</Button>
      )}
    </div>
  );
}