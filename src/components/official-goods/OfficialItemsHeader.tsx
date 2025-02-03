import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortOption = "newest" | "oldest" | "wishlist" | "owners";

interface OfficialItemsHeaderProps {
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
}

export function OfficialItemsHeader({ sortBy, onSortChange }: OfficialItemsHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex justify-between items-center mb-4 px-2">
      <div className="flex items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold animate-fade-in text-gray-900">
          公式グッズ
        </h1>
        <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
          <SelectTrigger className="w-[180px] bg-white/90 backdrop-blur-sm border-gray-200">
            <SelectValue placeholder="並び順を選択" />
          </SelectTrigger>
          <SelectContent className="bg-white/95 backdrop-blur-sm">
            <SelectItem value="newest" className="hover:bg-gray-100">新しい順</SelectItem>
            <SelectItem value="oldest" className="hover:bg-gray-100">古い順</SelectItem>
            <SelectItem value="wishlist" className="hover:bg-gray-100">ウィッシュリスト登録数順</SelectItem>
            <SelectItem value="owners" className="hover:bg-gray-100">保有者数順</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button 
        onClick={() => navigate("/add-item")}
        className="bg-gray-900 hover:bg-gray-800 text-sm"
        size="sm"
      >
        新規追加
      </Button>
    </div>
  );
}