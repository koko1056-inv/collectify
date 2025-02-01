import React from "react";
import { Tag } from "@/types";
import { TagFilter } from "./TagFilter";
import { SearchBar } from "./SearchBar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  selectedContent: string;
  onContentChange: (content: string) => void;
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
  const { data: contentNames = [] } = useQuery({
    queryKey: ["content-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_names")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-3">
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        selectedTags={selectedTags}
        onTagsChange={onTagsChange}
        tags={tags}
      />

      <div className="max-w-xl mx-auto">
        <Select
          value={selectedContent}
          onValueChange={onContentChange}
        >
          <SelectTrigger className="bg-background border-input">
            <SelectValue placeholder="コンテンツで絞り込む" />
          </SelectTrigger>
          <SelectContent className="bg-popover border rounded-md shadow-md">
            <SelectItem 
              value="all" 
              className="hover:bg-accent hover:text-accent-foreground py-2.5"
            >
              すべて
            </SelectItem>
            {contentNames.map((content) => (
              <SelectItem 
                key={content.id} 
                value={content.name}
                className="hover:bg-accent hover:text-accent-foreground py-2.5"
              >
                {content.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TagFilter
        selectedTags={selectedTags}
        onTagsChange={onTagsChange}
        tags={tags}
      />
    </div>
  );
}