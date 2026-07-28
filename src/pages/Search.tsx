import React from "react";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FilterBar } from "@/components/FilterBar";
import { OfficialItemsList } from "@/components/OfficialItemsList";
import { FriendSearch } from "@/components/search/FriendSearch";
import { TradeMatchingSection } from "@/components/trade/TradeMatchingSection";
import { PublicCollectionView } from "@/components/collection/PublicCollectionView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOfficialItems } from "@/hooks/useOfficialItems";
import { useTags } from "@/hooks/useTags";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Package, Users, Camera, ArrowLeftRight, Heart, SlidersHorizontal, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { SearchBar } from "@/components/SearchBar";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";

const Search = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const queryClient = useQueryClient();
  const {
    data: items = [],
    isLoading: itemsLoading,
    isError: itemsError,
    refetch: refetchItems,
  } = useOfficialItems();
  const { data: allTags = [] } = useTags(selectedContent);

  // コンテンツ名を早期に取得
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

  // Supabase Realtimeでofficial_itemsの変更を監視
  useEffect(() => {
    const channel = supabase
      .channel('official-items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'official_items' }, () => {
        queryClient.invalidateQueries({ queryKey: ['official-items'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const currentTab = searchParams.get("tab") || "goods";

  const handleTabChange = useCallback((tab: string) => {
    setSearchParams({ tab });
  }, [setSearchParams]);

  // ユーザーの興味のあるコンテンツをデフォルトで設定
  useEffect(() => {
    if (profile?.interests && Array.isArray(profile.interests) && profile.interests.length > 0 && !selectedContent && currentTab === "goods") {
      const firstInterestItem = profile.interests[0];
      let firstInterest: string;
      if (typeof firstInterestItem === 'string') {
        firstInterest = firstInterestItem;
      } else if (firstInterestItem && typeof firstInterestItem === 'object' && 'name' in firstInterestItem) {
        firstInterest = (firstInterestItem as any).name;
      } else {
        firstInterest = String(firstInterestItem);
      }
      setSelectedContent(firstInterest);
    }
  }, [profile, selectedContent, currentTab]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const itemId = searchParams.get('item');
    if (itemId && items.length > 0) {
      const targetItem = items.find(item => item.id === itemId);
      if (targetItem) {
        setSearchQuery(targetItem.title);
        setSearchParams({ tab: "goods" });
      }
    }
  }, [location.search, items, setSearchParams]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return items.filter(item => {
      const matchesSearch = q
        ? item.title.toLowerCase().includes(q) ||
          (item.artist?.toLowerCase() || "").includes(q) ||
          (item.anime?.toLowerCase() || "").includes(q)
        : true;
      const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => item.item_tags?.some(itemTag => itemTag.tags?.name === tag));
      const matchesContent = !selectedContent || selectedContent === "all" || item.content_name === selectedContent;
      return matchesSearch && matchesTags && matchesContent;
    });
  }, [items, searchQuery, selectedTags, selectedContent]);

  const activeFilterCount = useMemo(
    () => (selectedContent && selectedContent !== "all" ? 1 : 0) + selectedTags.length,
    [selectedContent, selectedTags]
  );

  const clearAllFilters = useCallback(() => {
    setSelectedContent("all");
    setSelectedTags([]);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-2 pt-4 pb-24 sm:px-4 sm:pt-6 sm:pb-8">
        <div className="space-y-3 sm:space-y-6">
          <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
            {/* モバイルはアイコンの下にラベルを置くので、既定の h-10 だと収まらない */}
            <TabsList className="grid w-full grid-cols-4 max-w-lg mx-auto h-auto py-1 sm:h-10 sm:py-1">
              <TabsTrigger value="goods" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-0.5 sm:px-3 min-w-0">
                <Package className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="w-full text-center truncate">{t("tabs.goods")}</span>
              </TabsTrigger>
              <TabsTrigger value="collections" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-0.5 sm:px-3 min-w-0">
                <Heart className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="w-full text-center truncate">{t("screens.search.collectionsTab")}</span>
              </TabsTrigger>
              <TabsTrigger value="trade" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-0.5 sm:px-3 min-w-0">
                <ArrowLeftRight className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="w-full text-center truncate">{t("screens.search.tradeTab")}</span>
              </TabsTrigger>
              <TabsTrigger value="friends" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-0.5 sm:px-3 min-w-0">
                <Users className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="w-full text-center truncate">{t("tabs.friends")}</span>
              </TabsTrigger>
            </TabsList>

            {/* グッズ検索タブ - コンパクトフィルター */}
            <TabsContent value="goods" className="space-y-3">
              {/* 検索バー + フィルターボタン */}
              <div className="flex items-center gap-2 bg-background py-2">
                <div className="flex-1 min-w-0">
                  <SearchBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    selectedTags={selectedTags}
                    onTagsChange={setSelectedTags}
                    tags={allTags}
                    selectedContent={selectedContent}
                  />
                </div>
                {/* 写真で似ているグッズを探す。/image-search への唯一の導線なので消さないこと
                    （ここが無いと画像検索とその先の「この写真で登録する」に到達できなくなる）。 */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate("/image-search")}
                  className="shrink-0 h-9 w-9"
                  title={t("screens.search.searchByPhoto")}
                  aria-label={t("screens.search.searchByPhoto")}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className="shrink-0 h-9 w-9 relative"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </div>

              {/* アクティブフィルターチップ */}
              {activeFilterCount > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap px-1">
                  {selectedContent && selectedContent !== "all" && (
                    <Badge variant="secondary" className="text-xs gap-1 pr-1">
                      {selectedContent}
                      <button onClick={() => setSelectedContent("all")} className="ml-0.5 hover:bg-muted rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {selectedTags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs gap-1 pr-1">
                      #{tag}
                      <button onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))} className="ml-0.5 hover:bg-muted rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {t("screens.search.clearAll")}
                  </button>
                </div>
              )}

              <OfficialItemsList
                items={filteredItems}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                selectedContent={selectedContent}
                onContentChange={setSelectedContent}
                tags={allTags}
                isInitialLoading={itemsLoading}
                isError={itemsError}
                onRetry={() => refetchItems()}
              />

              {/* フィルターDrawer */}
              <Drawer open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
                <DrawerContent className="max-h-[85vh] px-4 pt-4 pb-8">
                  <div className="mx-auto w-full max-w-sm">
                    <DrawerTitle className="text-center font-medium mb-4">{t("screens.search.filterTitle")}</DrawerTitle>
                    <DrawerClose className="absolute right-4 top-4">
                      <button className="text-sm text-primary font-medium">{t("screens.search.done")}</button>
                    </DrawerClose>
                    <ScrollArea className="h-[65vh] pr-4">
                      <FilterBar
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        selectedTags={selectedTags}
                        onTagsChange={setSelectedTags}
                        selectedContent={selectedContent}
                        onContentChange={setSelectedContent}
                        tags={allTags}
                        contentNames={contentNames}
                      />
                    </ScrollArea>
                  </div>
                </DrawerContent>
              </Drawer>
            </TabsContent>

            <TabsContent value="collections" className="space-y-4 sm:space-y-6">
              <PublicCollectionView />
            </TabsContent>

            <TabsContent value="trade" className="space-y-4 sm:space-y-6">
              <TradeMatchingSection />
            </TabsContent>

            <TabsContent value="friends" className="space-y-4 sm:space-y-6">
              <FriendSearch 
                userInterests={
                  Array.isArray(profile?.interests) 
                    ? profile.interests.map(interest => 
                        typeof interest === 'string' ? interest : 
                        interest && typeof interest === 'object' && 'name' in interest ? 
                        (interest as any).name : String(interest)
                      )
                    : []
                } 
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      {currentTab === "goods" && (
        // 撮影→AI解析フロー(/quick-add)を既定の追加導線にする。
        // 手入力(/add-item)へは /quick-add 内のリンクから辿れる。
        // 下タブ中央の丸い「みつける」ボタンと同じ形・同じ色だと見分けがつかないため、
        // こちらは文字付きの横長ボタンにして「探す」と「登録する」を区別する。
        <Button
          onClick={() => navigate("/quick-add")}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 sm:bottom-8 sm:right-8 z-50 h-12 pl-4 pr-5 gap-2 rounded-full shadow-lg"
          title={t("chrome.collection.addByPhoto")}
          aria-label={t("chrome.collection.addByPhoto")}
        >
          <Camera className="h-5 w-5" />
          <span className="text-sm font-semibold">{t("chrome.fab.addShort")}</span>
        </Button>
      )}
      
      <Footer />
    </div>
  );
};

export default Search;
