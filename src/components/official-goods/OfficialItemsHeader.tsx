import { memo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tags, Upload, MoreVertical, CheckSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContentTagManageModal } from "@/components/tag/ContentTagManageModal";

type SortOption = "newest" | "oldest" | "wishlist" | "owners-desc" | "owners-asc" | "not-owned";

interface OfficialItemsHeaderProps {
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  totalItems?: number;
  onFilterClick?: () => void;
  showBulkImport?: boolean;
  onBulkImportClick?: () => void;
  onSelectionModeClick?: () => void;
  showSelectionMode?: boolean;
}

export const OfficialItemsHeader = memo(function OfficialItemsHeader({
  sortBy,
  onSortChange,
  totalItems = 0,
  showBulkImport,
  onBulkImportClick,
  onSelectionModeClick,
  showSelectionMode,
}: OfficialItemsHeaderProps) {
  const [isTagManageOpen, setIsTagManageOpen] = useState(false);

  const handleTagManageOpen = useCallback(() => setIsTagManageOpen(true), []);
  const handleTagManageClose = useCallback(() => setIsTagManageOpen(false), []);
  const handleSortChange = useCallback((value: string) => {
    onSortChange(value as SortOption);
  }, [onSortChange]);

  return (
    <div className="flex justify-between items-center gap-2 px-2">
      <div className="flex items-baseline gap-2 min-w-0">
        <h1 className="text-sm sm:text-2xl font-bold text-foreground">グッズ</h1>
        <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
          全{totalItems}件
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Select value={sortBy} onValueChange={handleSortChange} defaultValue="newest">
          <SelectTrigger className="w-[110px] sm:w-[160px] h-8 sm:h-9 text-xs sm:text-sm">
            <SelectValue placeholder="並び順" />
          </SelectTrigger>
          <SelectContent position="popper" className="bg-popover border border-border z-50">
            <SelectItem value="newest">新しい順</SelectItem>
            <SelectItem value="oldest">古い順</SelectItem>
            <SelectItem value="wishlist">ウィッシュリスト順</SelectItem>
            <SelectItem value="owners-desc">保有者数（多）</SelectItem>
            <SelectItem value="owners-asc">保有者数（少）</SelectItem>
            <SelectItem value="not-owned">未所持</SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover z-50">
            <DropdownMenuItem onClick={handleTagManageOpen}>
              <Tags className="h-4 w-4 mr-2" />
              タグ管理
            </DropdownMenuItem>
            {showSelectionMode && (
              <DropdownMenuItem onClick={onSelectionModeClick}>
                <CheckSquare className="h-4 w-4 mr-2" />
                選択モード
              </DropdownMenuItem>
            )}
            {showBulkImport && (
              <DropdownMenuItem onClick={onBulkImportClick}>
                <Upload className="h-4 w-4 mr-2" />
                一括追加
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ContentTagManageModal isOpen={isTagManageOpen} onClose={handleTagManageClose} />
    </div>
  );
});
