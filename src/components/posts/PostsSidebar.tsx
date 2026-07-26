import { useState, useMemo, memo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter, Hash, Package, X, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingTags } from "./TrendingTags";
import { WeeklyRanking } from "./WeeklyRanking";
import { useLanguage } from "@/contexts/LanguageContext";

interface PostsSidebarProps {
  onFiltersChange?: (filters: {
    selectedTags: string[];
    selectedContent: string;
    searchQuery: string;
    selectedItemIds: string[];
  }) => void;
}

export const PostsSidebar = memo(function PostsSidebar({ onFiltersChange }: PostsSidebarProps) {
  const { t } = useLanguage();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemSearchQuery, setItemSearchQuery] = useState("");

  // 投稿されているグッズ一覧を取得
  const { data: postedItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ["posts", "posted-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goods_posts')
        .select(`
          user_item_id,
          user_items!inner(
            id,
            title,
            image,
            content_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // 重複を削除してユニークなグッズのみ取得
      const uniqueItems = new Map();
      data?.forEach(post => {
        if (post.user_items && !uniqueItems.has(post.user_items.id)) {
          uniqueItems.set(post.user_items.id, post.user_items);
        }
      });
      
      return Array.from(uniqueItems.values()).slice(0, 20);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // コンテンツ名の一覧を取得
  const { data: contentNames = [], isLoading: isLoadingContent } = useQuery({
    queryKey: ["posts", "content-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_items')
        .select('content_name')
        .not('content_name', 'is', null)
        .limit(100);

      if (error) throw error;

      return Array.from(new Set(
        data?.map(item => item.content_name)
          .filter(Boolean)
      )).slice(0, 10);
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  // 人気タグ
  const { data: popularTags = [] } = useQuery({
    queryKey: ["posts", "popular-tags-optimized"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('id, name')
        .in('category', ['type', 'character', 'series'])
        .order('name')
        .limit(15);
        
      if (error) throw error;
      return data || [];
    },
    staleTime: 20 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });

  const notifyFiltersChange = useCallback((updates: Partial<{
    selectedTags: string[];
    selectedContent: string;
    searchQuery: string;
    selectedItemIds: string[];
  }>) => {
    onFiltersChange?.({
      selectedTags: updates.selectedTags ?? selectedTags,
      selectedContent: updates.selectedContent ?? selectedContent,
      searchQuery: updates.searchQuery ?? searchQuery,
      selectedItemIds: updates.selectedItemIds ?? selectedItemIds,
    });
  }, [selectedTags, selectedContent, searchQuery, selectedItemIds, onFiltersChange]);

  const handleItemToggle = (itemId: string) => {
    const newItems = selectedItemIds.includes(itemId)
      ? selectedItemIds.filter(id => id !== itemId)
      : [...selectedItemIds, itemId];
    
    setSelectedItemIds(newItems);
    notifyFiltersChange({ selectedItemIds: newItems });
  };

  const handleTagToggle = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter(t => t !== tagName)
      : [...selectedTags, tagName];
    
    setSelectedTags(newTags);
    notifyFiltersChange({ selectedTags: newTags });
  };

  const handleContentSelect = (content: string) => {
    const newContent = selectedContent === content ? "" : content;
    setSelectedContent(newContent);
    notifyFiltersChange({ selectedContent: newContent });
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    notifyFiltersChange({ searchQuery: query });
  };

  const clearAllFilters = () => {
    setSelectedTags([]);
    setSelectedContent("");
    setSearchQuery("");
    setSelectedItemIds([]);
    onFiltersChange?.({
      selectedTags: [],
      selectedContent: "",
      searchQuery: "",
      selectedItemIds: [],
    });
  };

  const removeTag = (tagName: string) => {
    const newTags = selectedTags.filter(t => t !== tagName);
    setSelectedTags(newTags);
    notifyFiltersChange({ selectedTags: newTags });
  };

  const removeItem = (itemId: string) => {
    const newItems = selectedItemIds.filter(id => id !== itemId);
    setSelectedItemIds(newItems);
    notifyFiltersChange({ selectedItemIds: newItems });
  };

  const hasActiveFilters = selectedTags.length > 0 || selectedContent || searchQuery || selectedItemIds.length > 0;

  // グッズの検索フィルタリング
  const filteredItems = useMemo(() => {
    if (!itemSearchQuery) return postedItems;
    const query = itemSearchQuery.toLowerCase();
    return postedItems.filter((item: any) => 
      item.title?.toLowerCase().includes(query) || 
      item.content_name?.toLowerCase().includes(query)
    );
  }, [postedItems, itemSearchQuery]);

  return (
    <div className="w-full space-y-4 p-4">
      {/* トレンドタグ */}
      <Card>
        <CardContent className="pt-4">
          <TrendingTags 
            onTagClick={handleTagToggle} 
            selectedTags={selectedTags} 
          />
        </CardContent>
      </Card>

      {/* 週間ランキング */}
      <Card>
        <CardContent className="pt-4">
          <WeeklyRanking />
        </CardContent>
      </Card>

      {/* 検索 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {t("social.posts.filterPosts")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">{t("social.posts.keywordSearch")}</Label>
            <Input
              id="search"
              placeholder={t("social.posts.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-9"
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              {t("social.posts.clearAll")}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* グッズで絞り込み */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            {t("social.posts.filterByGoods")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="item-search">{t("social.posts.searchGoods")}</Label>
            <Input
              id="item-search"
              placeholder={t("social.posts.goodsNamePlaceholder")}
              value={itemSearchQuery}
              onChange={(e) => setItemSearchQuery(e.target.value)}
              className="h-9"
            />
          </div>
          <ScrollArea className="h-64">
            <div className="space-y-2 pr-4">
              {isLoadingItems ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("social.posts.goodsLoading")}
                </p>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemToggle(item.id)}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedItemIds.includes(item.id)
                        ? 'bg-primary/10 border-2 border-primary'
                        : 'bg-secondary/50 hover:bg-secondary'
                    }`}
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.content_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.content_name}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {itemSearchQuery ? t("social.posts.noResults") : t("social.posts.noGoods")}
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* コンテンツ名で絞り込み */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t("social.posts.filterByContent")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {isLoadingContent ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("social.posts.contentLoading")}
              </p>
            ) : contentNames.length > 0 ? (
              contentNames.map((content) => (
                <Button
                  key={content}
                  variant={selectedContent === content ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleContentSelect(content)}
                  className="w-full justify-start text-left h-auto py-2 px-3"
                >
                  <span className="truncate">{content}</span>
                </Button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("social.posts.noContent")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* タグで絞り込み */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="h-4 w-4" />
            {t("social.posts.filterByTag")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {popularTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.name) ? "default" : "secondary"}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleTagToggle(tag.name)}
                  >
                    #{tag.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("social.posts.tagLoading")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* アクティブフィルター */}
      {hasActiveFilters && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>{t("social.posts.activeFilters")}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-7 text-xs"
              >
                {t("social.posts.clearAll")}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {searchQuery && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1">{t("social.posts.keyword")}</Label>
                <Badge variant="outline" className="text-xs">
                  {searchQuery}
                </Badge>
              </div>
            )}

            {selectedItemIds.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1">
                  {t("social.posts.goodsWithCount", { count: selectedItemIds.length })}
                </Label>
                <div className="flex flex-wrap gap-1">
                  {selectedItemIds.map((itemId) => {
                    const item = postedItems.find((i: any) => i.id === itemId);
                    return (
                      <Badge
                        key={itemId}
                        variant="secondary"
                        className="text-xs gap-1 pr-1"
                      >
                        <span className="truncate max-w-[120px]">
                          {item?.title || itemId}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(itemId);
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedContent && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1">{t("social.posts.content")}</Label>
                <Badge variant="outline" className="text-xs gap-1 pr-1">
                  {selectedContent}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedContent("");
                      notifyFiltersChange({ selectedContent: "" });
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            )}

            {selectedTags.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1">
                  {t("social.posts.tagsWithCount", { count: selectedTags.length })}
                </Label>
                <div className="flex flex-wrap gap-1">
                  {selectedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs gap-1 pr-1"
                    >
                      #{tag}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTag(tag);
                        }}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
});