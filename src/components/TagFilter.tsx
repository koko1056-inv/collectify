
import React, { useState, useEffect } from "react";
import { Tag } from "@/types/tag";
import { useCatalogTagCounts } from "@/hooks/useCatalogTagCounts";
import { FilterButton } from "./tag/FilterButton";
import { PopularTags } from "./tag/PopularTags";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Pocke } from "@/components/pocke/Pocke";
import { useLanguage } from "@/contexts/LanguageContext";
// 選択中の印。以前は文字の ✓ で、フォントによって太さや高さがばらついていた
import { Check } from "lucide-react";

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tags: Tag[];
  selectedContent?: string;
}

export function TagFilter({ selectedTags, onTagsChange, tags, selectedContent }: TagFilterProps) {
  const { t } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");

  // 作品ごとのタグの数はサーバーで数える。以前はグッズの id を何千件も URL に並べていて、
  // 大きい作品（ちいかわ 約1万件）では URL が長すぎて 400 になり、タグが1つも出なかった
  const {
    data: tagsWithCount = [],
    isLoading: tagsLoading,
    isError: tagsError,
    refetch: refetchTags,
  } = useCatalogTagCounts(selectedContent);

  const getDisplayText = () => {
    if (selectedTags.length === 0) return t("chrome.tagFilter.selectFromTags");
    if (selectedTags.length === 1) return selectedTags[0];
    return t("chrome.tagFilter.selectedCount", { n: selectedTags.length });
  };

  const popularTags = tagsWithCount.slice(0, 5);

  // カテゴリ別にタグを分類
  const characterTags = tagsWithCount.filter(tag => tag.category === 'character');
  const seriesTags = tagsWithCount.filter(tag => tag.category === 'series');
  const typeTags = tagsWithCount.filter(tag => tag.category === 'type');
  const sourceTags = tagsWithCount.filter(tag => tag.category === 'source');

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
              {t("chrome.tagFilter.dialogTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 pb-0">
            <Input
              placeholder={t("chrome.tagFilter.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">{t("chrome.common.all")}</TabsTrigger>
              <TabsTrigger value="character">{t("chrome.tagFilter.tabCharacter")}</TabsTrigger>
              <TabsTrigger value="series">{t("chrome.tagFilter.tabSeries")}</TabsTrigger>
              <TabsTrigger value="type">{t("chrome.tagFilter.tabType")}</TabsTrigger>
              <TabsTrigger value="source">{t("chrome.tagFilter.tabSource")}</TabsTrigger>
            </TabsList>

            <ScrollArea className="max-h-[50vh] mt-4">
              {tagsLoading ? (
                // 読み込み中: ポッケが考え中の顔で待つ（空の「タグがありません」を先に出さない）
                <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
                  <Pocke pose="think" height={72} motion="bob" />
                  {t("chrome.tagFilter.loading")}
                </div>
              ) : tagsError ? (
                // 読み込めなかったとき: 「タグがありません」と誤解させず、もう一度読み込めるようにする
                <QueryErrorState onRetry={() => void refetchTags()} className="py-8" />
              ) : (
              <>
              <TabsContent value="all" className="mt-0 px-4">
                <div className="space-y-4">
                  {/* 人気タグ */}
                  {searchQuery === "" && popularTags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">{t("chrome.tagFilter.popularTags")}</h3>
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
                            {selectedTags.includes(tag.name) && <Check className="ml-1 h-3.5 w-3.5" aria-hidden="true" />}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 全タグリスト */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      {searchQuery ? t("chrome.tagFilter.searchResultsFor", { query: searchQuery }) : t("chrome.tagFilter.allTags")}
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
                            {selectedTags.includes(tag.name) && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
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
                        {selectedTags.includes(tag.name) && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      </div>
                    </Button>
                  ))}
                  {filterTagsBySearch(characterTags).length === 0 && (
                    <EmptyState
                      title={searchQuery ? t("chrome.tagFilter.noMatchingTags") : t("chrome.tagFilter.noTags")}
                      className="py-8"
                    />
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
                        {selectedTags.includes(tag.name) && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      </div>
                    </Button>
                  ))}
                  {filterTagsBySearch(seriesTags).length === 0 && (
                    <EmptyState
                      title={searchQuery ? t("chrome.tagFilter.noMatchingTags") : t("chrome.tagFilter.noTags")}
                      className="py-8"
                    />
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
                        {selectedTags.includes(tag.name) && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      </div>
                    </Button>
                  ))}
                  {filterTagsBySearch(typeTags).length === 0 && (
                    <EmptyState
                      title={searchQuery ? t("chrome.tagFilter.noMatchingTags") : t("chrome.tagFilter.noTags")}
                      className="py-8"
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="source" className="mt-0 px-4">
                <div className="grid grid-cols-1 gap-1">
                  {filterTagsBySearch(sourceTags).map((tag) => (
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
                        {selectedTags.includes(tag.name) && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      </div>
                    </Button>
                  ))}
                  {filterTagsBySearch(sourceTags).length === 0 && (
                    <EmptyState
                      title={searchQuery ? t("chrome.tagFilter.noMatchingTags") : t("chrome.tagFilter.noTags")}
                      className="py-8"
                    />
                  )}
                </div>
              </TabsContent>
              </>
              )}
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
