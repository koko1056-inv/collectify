import { Button } from "@/components/ui/button";
import { Tags, PlusCircle, Grid, List } from "lucide-react";

interface CollectionActionsProps {
  isCompact: boolean;
  onTagManage: () => void;
  onMemoryAdd: () => void;
  onViewToggle: () => void;
}

export function CollectionActions({
  isCompact,
  onTagManage,
  onMemoryAdd,
  onViewToggle,
}: CollectionActionsProps) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onTagManage}
          className="gap-2"
        >
          <Tags className="h-4 w-4" />
          <span>タグを管理</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onMemoryAdd}
          className="gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          <span>記録を追加</span>
        </Button>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onViewToggle}
        className="gap-2"
      >
        {isCompact ? (
          <>
            <Grid className="h-4 w-4" />
            <span>通常表示</span>
          </>
        ) : (
          <>
            <List className="h-4 w-4" />
            <span>一覧表示</span>
          </>
        )}
      </Button>
    </div>
  );
}