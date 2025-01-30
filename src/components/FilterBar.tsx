import { SearchBar } from "./SearchBar";
import { TagFilter } from "./TagFilter";
import { ContentFilter } from "./ContentFilter";
import { Tag } from "@/types";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  selectedContent: string[];
  onContentChange: (content: string[]) => void;
  tags: Tag[];
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedTags,
  onTagsChange,
  selectedContent,
  onContentChange,
  tags,
}: FilterBarProps) {
  return (
    <div className="space-y-3">
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        placeholder="コレクションを検索"
        tags={tags}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:flex-1">
          <TagFilter
            selectedTags={selectedTags}
            onTagsChange={onTagsChange}
            tags={tags}
          />
        </div>
        <div className="w-full sm:flex-1">
          <ContentFilter
            selectedContent={selectedContent}
            onContentChange={onContentChange}
          />
        </div>
      </div>
    </div>
  );
}