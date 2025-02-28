
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tag } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect } from "react";

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
  
  // コンポーネントのマウント時と検索クエリの変更時にログを出力
  useEffect(() => {
    console.log("SearchBar rendered with query:", searchQuery);
  }, [searchQuery]);
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Search input changed to:", e.target.value);
    // リアルタイム検索のため、入力の度に親コンポーネントに通知
    onSearchChange(e.target.value);
  };

  // モバイルの場合はルーペアイコンクリックでも検索を実行
  const handleSearchIconClick = () => {
    console.log("Search icon clicked");
    if (isMobile) {
      console.log("Executing search on mobile with query:", searchQuery);
      onSearchChange(searchQuery);
    }
  };

  // Enterキーを押したときにも検索を実行
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      console.log("Enter key pressed, executing search with query:", searchQuery);
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
