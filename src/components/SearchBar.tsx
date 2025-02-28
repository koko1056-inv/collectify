
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tag } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tags: Tag[];
}

export function SearchBar({
  searchQuery,
  onSearchChange,
}: SearchBarProps) {
  const isMobile = useIsMobile();
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const handleSearchIconClick = () => {
    // 検索アイコンをクリックしたときに検索を実行する
    // モバイルの場合、現在の検索クエリで検索を再実行する
    if (isMobile) {
      onSearchChange(searchQuery);
    }
  };

  // Enterキーを押したときにも検索を実行
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearchChange(searchQuery);
    }
  };

  return (
    <div className="max-w-xl mx-auto mb-4">
      <div className="relative">
        <Input
          type="text"
          placeholder="グッズを検索..."
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          className="pl-10 bg-white border-gray-200 focus:border-gray-300 focus:ring-gray-200"
        />
        <div 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer"
          onClick={handleSearchIconClick}
          aria-label="検索実行"
        >
          <Search className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
