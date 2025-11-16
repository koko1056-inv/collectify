import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Tags } from "lucide-react";
import { ContentTagManageModal } from "@/components/tag/ContentTagManageModal";

type SortOption = "newest" | "oldest" | "wishlist" | "owners-desc" | "owners-asc" | "not-owned";

interface OfficialItemsHeaderProps {
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  totalItems?: number;
  onFilterClick?: () => void;
}

export function OfficialItemsHeader({
  sortBy,
  onSortChange,
  totalItems = 0,
  onFilterClick
}: OfficialItemsHeaderProps) {
  const navigate = useNavigate();
  const [isTagManageOpen, setIsTagManageOpen] = useState(false);
  
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 px-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex flex-col">
          <h1 className="text-sm sm:text-2xl font-bold animate-fade-in text-gray-900">グッズ</h1>
          <p className="text-[10px] sm:text-xs text-gray-500">
            全{totalItems}件
          </p>
        </div>
        
        <Select
          value={sortBy} 
          onValueChange={(value) => onSortChange(value as SortOption)}
          defaultValue="newest"
        >
          <SelectTrigger className="w-[100px] sm:w-[150px] h-9 bg-white border border-gray-300 rounded-md focus:ring-0 focus:ring-offset-0 cursor-pointer">
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
      <div className="flex gap-2 shrink-0">
        <Button 
          onClick={() => setIsTagManageOpen(true)} 
          size="sm" 
          variant="outline"
          className="text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
        >
          <Tags className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
          <span className="hidden sm:inline">タグを管理</span>
          <span className="sm:hidden">タグ</span>
        </Button>
        <Button onClick={() => navigate("/add-item")} size="sm" className="bg-gray-900 hover:bg-gray-800 text-xs sm:text-sm px-2 sm:px-[14px] h-8 sm:h-9 whitespace-nowrap">
          グッズを追加
        </Button>
      </div>

      <ContentTagManageModal 
        isOpen={isTagManageOpen}
        onClose={() => setIsTagManageOpen(false)}
      />
    </div>
  );
}
