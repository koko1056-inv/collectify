
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
type SortOption = "newest" | "oldest" | "wishlist" | "owners";
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
  return <div className="flex justify-between items-center mb-4 px-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <h1 className="text-sm sm:text-2xl font-bold animate-fade-in text-gray-900">グッズ</h1>
          <p className="text-[10px] sm:text-xs text-gray-500">
            全{totalItems}件
          </p>
        </div>
        
        <Button variant="outline" size="sm" onClick={onFilterClick} className="flex items-center gap-1 mr-1 px-[9px] border border-gray-300">
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">探す</span>
        </Button>
        
        <Select value={sortBy} onValueChange={value => onSortChange(value as SortOption)}>
          <SelectTrigger className="w-[100px] sm:w-[150px] h-8 text-sm bg-white border border-gray-300 rounded-md">
            <SelectValue placeholder="並び順" />
          </SelectTrigger>
          <SelectContent position="popper" className="bg-white shadow-lg border border-gray-200 z-50">
            <SelectItem value="newest">新しい順</SelectItem>
            <SelectItem value="oldest">古い順</SelectItem>
            <SelectItem value="wishlist">ウィッシュリスト登録数順</SelectItem>
            <SelectItem value="owners">保有者数順</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={() => navigate("/add-item")} size="sm" className="bg-gray-900 hover:bg-gray-800 text-sm px-[14px]">
        グッズを追加
      </Button>
    </div>;
}
