import React from "react";
import { Tag } from "@/types";
import { TagFilter } from "./TagFilter";
import { SearchBar } from "./SearchBar";
import { ContentFilter } from "./ContentFilter";

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
        selectedTags={selectedTags}
        onTagsChange={onTagsChange}
        tags={tags}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <TagFilter
            selectedTags={selectedTags}
            onTagsChange={onTagsChange}
            tags={tags}
          />
        </div>
        <div className="flex-1">
          <ContentFilter
            selectedContent={selectedContent}
            onContentChange={onContentChange}
          />
        </div>
      </div>
    </div>
  );
}