
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "@/types";
import { FilterButton } from "./tag/FilterButton";
import { PopularTags } from "./tag/PopularTags";
import { TagDialog } from "./tag/TagDialog";

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tags: Tag[];
}

export function TagFilter({ selectedTags, onTagsChange }: TagFilterProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Tag[];
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const getDisplayText = () => {
    if (selectedTags.length === 0) return "タグから選択";
    if (selectedTags.length === 1) return selectedTags[0];
    return `${selectedTags.length}個のタグを選択中`;
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const popularTags = tags.slice(0, 5);

  React.useEffect(() => {
    const validTags = selectedTags.filter(tag => tags.some(t => t.name === tag));
    if (validTags.length !== selectedTags.length) {
      onTagsChange(validTags);
    }
  }, [tags, selectedTags, onTagsChange]);

  const handleTagToggle = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter(tag => tag !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  return (
    <div className="space-y-2">
      <FilterButton
        displayText={getDisplayText()}
        onClick={() => setIsDialogOpen(true)}
      />

      <PopularTags
        tags={popularTags}
        selectedTags={selectedTags}
        onTagSelect={handleTagToggle}
        onClearTags={() => onTagsChange([])}
      />

      <TagDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filteredTags={filteredTags}
        selectedTags={selectedTags}
        onTagSelect={handleTagToggle}
        onClearTags={() => onTagsChange([])}
      />
    </div>
  );
}
