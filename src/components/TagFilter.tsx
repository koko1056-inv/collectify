
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tags: Tag[];
  selectedContent?: string;
}

export function TagFilter({ selectedTags, onTagsChange, tags, selectedContent }: TagFilterProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");

  const { data: tagsWithCount = [] } = useQuery({
    queryKey: ["tags-with-count", selectedContent],
    queryFn: async () => {
      // コンテンツが選択されている場合、そのコンテンツのアイテムに付けられているタグのみを取得
      if (selectedContent && selectedContent !== "all") {
        // 1. 選択されたコンテンツのofficial_itemsを取得
        const { data: items, error: itemsError } = await supabase
          .from('official_items')
          .select('id')
          .eq('content_name', selectedContent);

        if (itemsError) throw itemsError;
        
        if (!items || items.length === 0) {
          return [];
        }

        const itemIds = items.map(item => item.id);

        // 2. それらのアイテムに付けられているタグを取得
        const { data: itemTags, error: itemTagsError } = await supabase
          .from('item_tags')
          .select(`
            tag_id,
            tags:tag_id (
              id,
              name,
              category,
              content_id,
              created_at
            )
          `)
          .in('official_item_id', itemIds);

        if (itemTagsError) throw itemTagsError;

        // 3. タグのカウントを計算
        const tagCounts: Record<string, Tag & { count: number }> = {};
        
        for (const itemTag of itemTags) {
          if (itemTag.tags) {
            const tag = itemTag.tags as any;
            if (!tagCounts[tag.id]) {
              tagCounts[tag.id] = {
                id: tag.id,
                name: tag.name,
                category: tag.category,
                count: 0,
                created_at: tag.created_at
              };
            }
            tagCounts[tag.id].count++;
          }
        }

        // グッズタイプはコンテンツに関係なく表示
        const { data: typeTags, error: typeTagsError } = await supabase
          .from('tags')
          .select('*')
          .eq('category', 'type');

        if (!typeTagsError && typeTags) {
          for (const tag of typeTags) {
            if (!tagCounts[tag.id]) {
              tagCounts[tag.id] = {
                ...tag,
                count: 0
              };
            }
          }
        }

        return Object.values(tagCounts).sort((a, b) => b.count - a.count);
      } else {
        // コンテンツが選択されていない場合は全てのタグを取得
        const { data: itemTags, error } = await supabase
          .from('item_tags')
          .select(`
            tag_id,
            tags:tag_id (
              id,
              name,
              category,
              content_id,
              created_at
            )
          `);

        if (error) throw error;

        const tagCounts: Record<string, Tag & { count: number }> = {};
        
        for (const itemTag of itemTags) {
          if (itemTag.tags) {
            const tag = itemTag.tags as any;
            if (!tagCounts[tag.id]) {
              tagCounts[tag.id] = {
                id: tag.id,
                name: tag.name,
                category: tag.category,
                count: 0,
                created_at: tag.created_at
              };
            }
            tagCounts[tag.id].count++;
          }
        }

        return Object.values(tagCounts).sort((a, b) => b.count - a.count);
      }
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

  // カテゴリ別にタグを分類
  const characterTags = tagsWithCount.filter(tag => tag.category === 'character');
  const seriesTags = tagsWithCount.filter(tag => tag.category === 'series');
  const typeTags = tagsWithCount.filter(tag => tag.category === 'type');

  // 検索フィルタリング
  const filterTagsBySearch = (tagsList: typeof tagsWithCount) => {
    if (!searchQuery) return tagsList;
    return tagsList.filter(tag => 
      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

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
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">すべて</TabsTrigger>
              <TabsTrigger value="character">キャラ・人物</TabsTrigger>
              <TabsTrigger value="series">シリーズ</TabsTrigger>
              <TabsTrigger value="type">タイプ</TabsTrigger>
            </TabsList>

            <ScrollArea className="max-h-[50vh] mt-4">
              <TabsContent value="all" className="mt-0 px-4">
                <div className="space-y-4">
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
                            onClick={() => handleTagToggle(tag.name)}
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
                    <div className="grid grid-cols-1 gap-1">
                      {filterTagsBySearch(tagsWithCount).map((tag) => (
                        <Button
                          key={tag.id}
                          variant={selectedTags.includes(tag.name) ? "default" : "ghost"}
                          size="sm"
                          className="justify-between text-left h-auto py-2 px-3"
                          onClick={() => handleTagToggle(tag.name)}
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
              </TabsContent>

              <TabsContent value="character" className="mt-0 px-4">
                <div className="grid grid-cols-1 gap-1">
                  {filterTagsBySearch(characterTags).map((tag) => (
                    <Button
                      key={tag.id}
                      variant={selectedTags.includes(tag.name) ? "default" : "ghost"}
                      size="sm"
                      className="justify-between text-left h-auto py-2 px-3"
                      onClick={() => handleTagToggle(tag.name)}
                    >
                      <span className="truncate">{tag.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">({tag.count})</span>
                        {selectedTags.includes(tag.name) && <span className="text-xs">✓</span>}
                      </div>
                    </Button>
                  ))}
                  {filterTagsBySearch(characterTags).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {searchQuery ? "該当するタグがありません" : "タグがありません"}
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="series" className="mt-0 px-4">
                <div className="grid grid-cols-1 gap-1">
                  {filterTagsBySearch(seriesTags).map((tag) => (
                    <Button
                      key={tag.id}
                      variant={selectedTags.includes(tag.name) ? "default" : "ghost"}
                      size="sm"
                      className="justify-between text-left h-auto py-2 px-3"
                      onClick={() => handleTagToggle(tag.name)}
                    >
                      <span className="truncate">{tag.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">({tag.count})</span>
                        {selectedTags.includes(tag.name) && <span className="text-xs">✓</span>}
                      </div>
                    </Button>
                  ))}
                  {filterTagsBySearch(seriesTags).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {searchQuery ? "該当するタグがありません" : "タグがありません"}
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="type" className="mt-0 px-4">
                <div className="grid grid-cols-1 gap-1">
                  {filterTagsBySearch(typeTags).map((tag) => (
                    <Button
                      key={tag.id}
                      variant={selectedTags.includes(tag.name) ? "default" : "ghost"}
                      size="sm"
                      className="justify-between text-left h-auto py-2 px-3"
                      onClick={() => handleTagToggle(tag.name)}
                    >
                      <span className="truncate">{tag.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">({tag.count})</span>
                        {selectedTags.includes(tag.name) && <span className="text-xs">✓</span>}
                      </div>
                    </Button>
                  ))}
                  {filterTagsBySearch(typeTags).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {searchQuery ? "該当するタグがありません" : "タグがありません"}
                    </p>
                  )}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
