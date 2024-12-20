import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tag } from "@/types";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTag: string | null;
  onTagSelect: (tagName: string | null) => void;
  tags: Tag[];
}

export function SearchBar({
  searchQuery,
  onSearchChange,
  selectedTag,
  onTagSelect,
  tags,
}: SearchBarProps) {
  return (
    <div className="max-w-xl mx-auto mb-8">
      <div className="relative mb-4">
        <Input
          type="text"
          placeholder="グッズを検索..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-white border-gray-200 focus:border-gray-300 focus:ring-gray-200"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
      </div>
      
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge
            key={tag.id}
            variant={selectedTag === tag.name ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => {
              if (selectedTag === tag.name) {
                onTagSelect(null);
              } else {
                onTagSelect(tag.name);
              }
            }}
          >
            {tag.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}