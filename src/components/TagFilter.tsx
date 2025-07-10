
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "@/types/tag";
import { FilterButton } from "./tag/FilterButton";
import { PopularTags } from "./tag/PopularTags";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tags: Tag[];
}

export function TagFilter({ selectedTags, onTagsChange, tags }: TagFilterProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              タグを選択
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 pb-0">
            <Input
              placeholder="タグを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />
          </div>
          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="p-4 space-y-4">
              {/* 人気タグ */}
              {searchQuery === "" && popularTags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">人気タグ</h3>
                  <div className="flex flex-wrap gap-2">
                    {popularTags.map((tag) => (
                      <Button
                        key={tag.id}
                        variant={selectedTags.includes(tag.name) ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-7 px-3"
                        onClick={() => {
                          handleTagToggle(tag.name);
                        }}
                      >
                        {tag.name}
                        {selectedTags.includes(tag.name) && <span className="ml-1">✓</span>}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* 全タグリスト */}
              <div>
                <h3 className="text-sm font-medium mb-2">
                  {searchQuery ? `"${searchQuery}"の検索結果` : "すべてのタグ"}
                </h3>
                <div className="grid grid-cols-1 gap-1 max-h-64 overflow-y-auto">
                  {tagsWithCount
                    .filter(tag => 
                      searchQuery === "" || 
                      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((tag) => (
                      <Button
                        key={tag.id}
                        variant={selectedTags.includes(tag.name) ? "default" : "ghost"}
                        size="sm"
                        className="justify-between text-left h-auto py-2 px-3"
                        onClick={() => {
                          handleTagToggle(tag.name);
                        }}
                      >
                        <span className="truncate">{tag.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">({tag.count})</span>
                          {selectedTags.includes(tag.name) && <span className="text-xs">✓</span>}
                        </div>
                      </Button>
                    ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
