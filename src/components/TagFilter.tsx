
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "@/types/tag";
import { FilterButton } from "./tag/FilterButton";
import { PopularTags } from "./tag/PopularTags";
import { TagDialog } from "./tag/TagDialog";

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tags: Tag[];
}

export function TagFilter({ selectedTags, onTagsChange, tags }: TagFilterProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: tagsWithCount = [] } = useQuery({
    queryKey: ["tags-with-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select(`
          *,
          item_tags (
            tag_id
          )
        `);

      if (error) throw error;

      // Create a map to count tag occurrences
      const tagCounts: Record<string, Tag & { count: number }> = {};
      
      for (const tag of data) {
        if (!tagCounts[tag.id]) {
          tagCounts[tag.id] = {
            ...tag,
            count: 0
          };
        }
        tagCounts[tag.id].count++;
      }

      return Object.values(tagCounts).sort((a, b) => b.count - a.count);
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const getDisplayText = () => {
    if (selectedTags.length === 0) return "タグから選択";
    if (selectedTags.length === 1) return selectedTags[0];
    return `${selectedTags.length}個のタグを選択中`;
  };

  const popularTags = tagsWithCount.slice(0, 5);

  React.useEffect(() => {
    const validTags = selectedTags.filter(tag => 
      tags.some(t => t.name === tag)
    );
    if (validTags.length !== selectedTags.length) {
      onTagsChange(validTags);
    }
  }, [tags, selectedTags, onTagsChange]);

  const handleTagToggle = (tagName: string) => {
    console.log(`タグ切り替え: ${tagName}`);
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter(tag => tag !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const handleTagsSelect = (newTags: string[]) => {
    console.log('新しいタグが選択されました:', newTags);
    const uniqueTags = [...new Set([...selectedTags, ...newTags])];
    onTagsChange(uniqueTags);
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
        onClearTags={() => {
          console.log('タグをクリア');
          onTagsChange([]);
        }}
      />

      <TagDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onTagsSelect={handleTagsSelect}
      />
    </div>
  );
}
