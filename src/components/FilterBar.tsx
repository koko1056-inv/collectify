import React from "react";
import { Tag } from "@/types";
import { TagFilter } from "./TagFilter";
import { SearchBar } from "./SearchBar";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTag: string | null;
  onTagSelect: (tagName: string | null) => void;
  tags: Tag[];
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedTag,
  onTagSelect,
  tags,
}: FilterBarProps) {
  return (
    <div className="space-y-4">
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        selectedTag={selectedTag}
        onTagSelect={onTagSelect}
        tags={tags}
      />

      <TagFilter
        selectedTag={selectedTag}
        onTagSelect={onTagSelect}
        tags={tags}
      />
    </div>
  );
}