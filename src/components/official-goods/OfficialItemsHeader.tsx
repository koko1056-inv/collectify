import { memo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tags, Upload } from "lucide-react";
import { ContentTagManageModal } from "@/components/tag/ContentTagManageModal";

type SortOption = "newest" | "oldest" | "wishlist" | "owners-desc" | "owners-asc" | "not-owned";

interface OfficialItemsHeaderProps {
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  totalItems?: number;
  onFilterClick?: () => void;
  showBulkImport?: boolean;
  onBulkImportClick?: () => void;
}

export const OfficialItemsHeader = memo(function OfficialItemsHeader({
  sortBy,
  onSortChange,
  totalItems = 0,
  onFilterClick,
  showBulkImport,
  onBulkImportClick
}: OfficialItemsHeaderProps) {
  const [isTagManageOpen, setIsTagManageOpen] = useState(false);
  
  const handleTagManageOpen = useCallback(() => setIsTagManageOpen(true), []);
  const handleTagManageClose = useCallback(() => setIsTagManageOpen(false), []);
  const handleSortChange = useCallback((value: string) => {
    onSortChange(value as SortOption);
  }, [onSortChange]);
  
  return (
    <div className="flex justify-between items-center gap-1.5 mb-4 px-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="flex flex-col min-w-0 shrink-0">
          <h1 className="text-xs sm:text-2xl font-bold animate-fade-in text-foreground truncate">グッズ</h1>
          <p className="text-[9px] sm:text-xs text-muted-foreground whitespace-nowrap">
            全{totalItems}件
          </p>
        </div>
        
        <Select
          value={sortBy} 
          onValueChange={handleSortChange}
          defaultValue="newest"
        >
          <SelectTrigger className="w-[80px] sm:w-[180px] h-7 sm:h-9 text-[10px] sm:text-sm bg-card border border-border rounded-md focus:ring-0 focus:ring-offset-0 cursor-pointer">
            <SelectValue placeholder="並び順" />
          </SelectTrigger>
          <SelectContent 
            position="popper"
            className="bg-popover border border-border rounded-md shadow-md z-50"
          >
            <SelectItem value="newest" className="cursor-pointer hover:bg-accent">新しい順</SelectItem>
            <SelectItem value="oldest" className="cursor-pointer hover:bg-accent">古い順</SelectItem>
            <SelectItem value="wishlist" className="cursor-pointer hover:bg-accent">ウィッシュリスト順</SelectItem>
            <SelectItem value="owners-desc" className="cursor-pointer hover:bg-accent">保有者数（多）</SelectItem>
            <SelectItem value="owners-asc" className="cursor-pointer hover:bg-accent">保有者数（少）</SelectItem>
            <SelectItem value="not-owned" className="cursor-pointer hover:bg-accent">未所持</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button 
          onClick={handleTagManageOpen} 
          size="sm" 
          variant="outline"
          className="h-7 sm:h-9 px-1.5 sm:px-3 text-[10px] sm:text-sm"
        >
          <Tags className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
          <span className="whitespace-nowrap">タグ管理</span>
        </Button>
        {showBulkImport && (
          <Button 
            onClick={onBulkImportClick} 
            size="sm" 
            variant="outline"
            className="h-7 sm:h-9 px-1.5 sm:px-3 text-[10px] sm:text-sm"
          >
            <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
            <span className="hidden sm:inline">一括追加</span>
            <span className="sm:hidden">一括</span>
          </Button>
        )}
      </div>

      <ContentTagManageModal 
        isOpen={isTagManageOpen}
        onClose={handleTagManageClose}
      />
    </div>
  );
});
