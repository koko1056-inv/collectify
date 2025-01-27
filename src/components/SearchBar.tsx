import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tag } from "@/types";

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
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  return (
    <div className="max-w-xl mx-auto mb-4">
      <div className="relative">
        <Input
          type="text"
          placeholder="グッズを検索..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="pl-10 w-full bg-white border-gray-200 hover:border-gray-300 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 transition-colors duration-200"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
      </div>
    </div>
  );
}