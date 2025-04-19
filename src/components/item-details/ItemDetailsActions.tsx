
import { Button } from "@/components/ui/button";
import { Tag, Trash2 } from "lucide-react";

interface ItemDetailsActionsProps {
  onTagManage: () => void;
  onDelete: () => void;
}

export function ItemDetailsActions({ 
  onTagManage, 
  onDelete 
}: ItemDetailsActionsProps) {
  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        className="flex-1 border-purple-200 hover:bg-purple-50 hover:border-purple-300"
        onClick={onTagManage}
      >
        <Tag className="h-4 w-4 mr-2" />
        タグを管理
      </Button>
      <Button 
        variant="outline" 
        className="flex-1 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-500"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        削除
      </Button>
    </div>
  );
}
