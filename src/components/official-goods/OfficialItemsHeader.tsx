
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SortOption = "newest" | "oldest" | "wishlist" | "owners";

interface OfficialItemsHeaderProps {
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  totalItems?: number;
}

export function OfficialItemsHeader({
  sortBy,
  onSortChange,
  totalItems = 0
}: OfficialItemsHeaderProps) {
  const navigate = useNavigate();
  
  return (
    <div className="flex justify-between items-center mb-4 px-2">
      <div className="flex items-center gap-2">
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
            <SelectItem value="owners" className="cursor-pointer hover:bg-gray-100">保有者数順</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={() => navigate("/add-item")} size="sm" className="bg-gray-900 hover:bg-gray-800 text-sm px-[14px]">
        グッズを追加
      </Button>
    </div>
  );
}
