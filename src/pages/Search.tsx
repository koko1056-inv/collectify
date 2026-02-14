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
import { useState, useEffect, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Package, Users, Plus, ArrowLeftRight, Heart, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
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
  const { data: items = [] } = useOfficialItems();
  const { data: allTags = [] } = useTags(selectedContent);

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

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

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

  const filteredItems = items.filter(item => {
    const matchesSearch = searchQuery ? item.title.toLowerCase().includes(searchQuery.toLowerCase()) || (item.artist?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || (item.anime?.toLowerCase() || "").includes(searchQuery.toLowerCase()) : true;
    const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => item.item_tags?.some(itemTag => itemTag.tags?.name === tag));
    const matchesContent = !selectedContent || selectedContent === "all" || item.content_name === selectedContent;
    return matchesSearch && matchesTags && matchesContent;
  });

  const activeFilterCount = (selectedContent && selectedContent !== "all" ? 1 : 0) + selectedTags.length;

  const clearAllFilters = useCallback(() => {
    setSelectedContent("all");
    setSelectedTags([]);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-2 pt-16 pb-24 sm:px-4 sm:pt-24 sm:pb-8">
        <div className="space-y-3 sm:space-y-6">
          <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-lg mx-auto">
              <TabsTrigger value="goods" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1 sm:px-3">
                <Package className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t("tabs.goods")}</span>
              </TabsTrigger>
              <TabsTrigger value="collections" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1 sm:px-3">
                <Heart className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">コレクション</span>
              </TabsTrigger>
              <TabsTrigger value="trade" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1 sm:px-3">
                <ArrowLeftRight className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">交換</span>
              </TabsTrigger>
              <TabsTrigger value="friends" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 text-[10px] sm:text-sm px-1 sm:px-3">
                <Users className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t("tabs.friends")}</span>
              </TabsTrigger>
            </TabsList>

            {/* グッズ検索タブ - コンパクトフィルター */}
            <TabsContent value="goods" className="space-y-3">
              {/* 検索バー + フィルターボタン */}
              <div className="flex items-center gap-2 sticky top-14 sm:top-20 z-20 bg-background py-2">
                <div className="flex-1">
                  <SearchBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    selectedTags={selectedTags}
                    onTagsChange={setSelectedTags}
                    tags={allTags}
                    selectedContent={selectedContent}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className="shrink-0 h-9 px-3 relative"
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
                    すべてクリア
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
              />

              {/* フィルターDrawer */}
              <Drawer open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
                <DrawerContent className="max-h-[85vh] px-4 pt-4 pb-8">
                  <div className="mx-auto w-full max-w-sm">
                    <DrawerTitle className="text-center font-medium mb-4">フィルター</DrawerTitle>
                    <DrawerClose className="absolute right-4 top-4">
                      <button className="text-sm text-primary font-medium">完了</button>
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
        <Button
          onClick={() => navigate("/add-item")}
          className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-50 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
      
      <Footer />
    </div>
  );
};

export default Search;
