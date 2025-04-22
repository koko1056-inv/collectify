
import { Button } from "@/components/ui/button";
import { Tag, Trash2 } from "lucide-react";

interface ItemDetailsActionsProps {
  isEditing: boolean;
  isSaving: boolean;
  onSave: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onTag: () => void;
  onDelete: () => void;
}

export function ItemDetailsActions({
  isEditing,
  isSaving,
  onSave,
  onEdit,
  onCancel,
  onTag,
  onDelete,
}: ItemDetailsActionsProps) {
  return (
    <div className="flex gap-2 px-6 py-4 border-t">
      {!isEditing ? (
        <>
          <Button
            variant="outline"
            className="flex-1 border-purple-200 hover:bg-purple-50 hover:border-purple-300"
            onClick={onTag}
          >
            <Tag className="h-4 w-4 mr-2" />
            タグを管理
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={onEdit}
          >
            編集
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-500"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            削除
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="default"
            className="flex-1"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? "保存中..." : "保存"}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isSaving}
          >
            キャンセル
          </Button>
        </>
      )}
    </div>
  );
}
