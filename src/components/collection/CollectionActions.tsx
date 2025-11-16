import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tags, PlusCircle, Grid, List } from "lucide-react";

interface CollectionActionsProps {
  isCompact: boolean;
  onTagManage: () => void;
  onMemoryAdd: () => void;
  onViewToggle: () => void;
}

export const CollectionActions = memo(function CollectionActions({
  isCompact,
  onTagManage,
  onMemoryAdd,
  onViewToggle,
}: CollectionActionsProps) {
  const handleTagManage = useCallback(() => onTagManage(), [onTagManage]);
  const handleMemoryAdd = useCallback(() => onMemoryAdd(), [onMemoryAdd]);
  const handleViewToggle = useCallback(() => onViewToggle(), [onViewToggle]);

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
      <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 sm:gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTagManage}
          className="gap-2 w-full sm:w-auto whitespace-nowrap"
        >
          <Tags className="h-4 w-4" />
          <span>タグを管理</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMemoryAdd}
          className="gap-2 w-full sm:w-auto whitespace-nowrap"
        >
          <PlusCircle className="h-4 w-4" />
          <span>記録を追加</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewToggle}
          className="gap-2 w-full sm:w-auto whitespace-nowrap"
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
    </div>
  );
});