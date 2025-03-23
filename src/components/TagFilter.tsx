
import React, { useState, useEffect } from "react";
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

      // タグの出現回数をカウントするマップを作成
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

      // 出現回数に基づいてソート
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

  // 有効なタグのみをフィルタリング
  useEffect(() => {
    if (!tags || tags.length === 0) return;
    
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
      // タグが既に選択されている場合は削除
      onTagsChange(selectedTags.filter(tag => tag !== tagName));
    } else {
      // タグが選択されていない場合は追加
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const handleTagsSelect = (newTags: string[]) => {
    console.log('新しいタグが選択されました:', newTags);
    // 新しいタグと既存のタグをマージして重複を削除
    const uniqueTags = [...new Set([...selectedTags, ...newTags])];
    onTagsChange(uniqueTags);
    console.log('フィルタリング後のタグ:', uniqueTags);
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
        initialTags={selectedTags}
        itemIds={[]} // 空の配列を渡す
      />
    </div>
  );
}
