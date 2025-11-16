import { memo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tags, PlusCircle } from "lucide-react";
import { ContentTagManageModal } from "@/components/tag/ContentTagManageModal";

type SortOption = "newest" | "oldest" | "wishlist" | "owners-desc" | "owners-asc" | "not-owned";

interface OfficialItemsHeaderProps {
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  totalItems?: number;
  onFilterClick?: () => void;
}

export const OfficialItemsHeader = memo(function OfficialItemsHeader({
  sortBy,
  onSortChange,
  totalItems = 0,
  onFilterClick
}: OfficialItemsHeaderProps) {
  const navigate = useNavigate();
  const [isTagManageOpen, setIsTagManageOpen] = useState(false);
  
  const handleTagManageOpen = useCallback(() => setIsTagManageOpen(true), []);
  const handleTagManageClose = useCallback(() => setIsTagManageOpen(false), []);
  const handleAddItem = useCallback(() => navigate("/add-item"), [navigate]);
  const handleSortChange = useCallback((value: string) => {
    onSortChange(value as SortOption);
  }, [onSortChange]);
  
  return (
    <div className="flex justify-between items-center gap-2 mb-4 px-2">
      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
        <div className="flex flex-col min-w-0">
          <h1 className="text-xs sm:text-2xl font-bold animate-fade-in text-gray-900 truncate">グッズ</h1>
          <p className="text-[9px] sm:text-xs text-gray-500 whitespace-nowrap">
            全{totalItems}件
          </p>
        </div>
        
        <Select
          value={sortBy} 
          onValueChange={handleSortChange}
          defaultValue="newest"
        >
          <SelectTrigger className="w-[80px] sm:w-[150px] h-7 sm:h-9 text-[10px] sm:text-sm bg-white border border-gray-300 rounded-md focus:ring-0 focus:ring-offset-0 cursor-pointer">
            <SelectValue placeholder="並び順" />
          </SelectTrigger>
          <SelectContent 
            position="popper"
            className="bg-white border border-gray-200 rounded-md shadow-md z-50"
          >
            <SelectItem value="newest" className="cursor-pointer hover:bg-gray-100">新しい順</SelectItem>
            <SelectItem value="oldest" className="cursor-pointer hover:bg-gray-100">古い順</SelectItem>
            <SelectItem value="wishlist" className="cursor-pointer hover:bg-gray-100">ウィッシュリスト登録数順</SelectItem>
            <SelectItem value="owners-desc" className="cursor-pointer hover:bg-gray-100">保有者数順（多い順）</SelectItem>
            <SelectItem value="owners-asc" className="cursor-pointer hover:bg-gray-100">保有者数順（少ない順）</SelectItem>
            <SelectItem value="not-owned" className="cursor-pointer hover:bg-gray-100">未所持</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-1 sm:gap-2 shrink-0">
        <Button 
          onClick={handleTagManageOpen} 
          size="sm" 
          variant="outline"
          className="h-7 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
        >
          <Tags className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
          <span className="whitespace-nowrap">タグ管理</span>
        </Button>
        <Button 
          onClick={handleAddItem} 
          size="sm"
          className="bg-gray-900 hover:bg-gray-800 h-7 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
        >
          <PlusCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
          <span className="whitespace-nowrap">追加</span>
        </Button>
      </div>

      <ContentTagManageModal 
        isOpen={isTagManageOpen}
        onClose={handleTagManageClose}
      />
    </div>
  );
});
