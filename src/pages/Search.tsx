import React from "react";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FilterBar } from "@/components/FilterBar";
import { OfficialItemsList } from "@/components/OfficialItemsList";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { FEED_PAGE, useCatalogContents, useCatalogFeed, useOfficialItems } from "@/hooks/useOfficialItems";
import { useTags } from "@/hooks/useTags";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Package, SlidersHorizontal, X, Image as ImageIcon, Loader2 } from "lucide-react";
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
import { CatalogFilterChips } from "@/components/catalog/CatalogFilterChips";
import { countChipFacets, isChipFilterActive, matchesChipFilter, type CatalogChipFilter } from "@/lib/goodsTaxonomy";
import { useZukanView } from "@/hooks/useZukanView";
import { ZukanPanel } from "@/components/zukan/ZukanPanel";

const Search = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState("");
  // 作品 → キャラ → カテゴリ → 入手方法 のチップでの絞り込み（キーワード・タグの絞り込みとは別に重ねる）
  const [chipFilter, setChipFilter] = useState<CatalogChipFilter>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const queryClient = useQueryClient();
  // 数万件を一度に読み込まない: 作品を選んでいればその作品だけ全件、
  // 選んでいなければ（言葉を入れた場合も）サーバーから新しい順に少しずつ読み足して、最後まで辿れるようにする。
  const activeContent = selectedContent && selectedContent !== "all" ? selectedContent : null;
  const workResult = useOfficialItems({ content: activeContent, enabled: !!activeContent });
  const feed = useCatalogFeed(searchQuery, !activeContent);
  const {
    isLoading: itemsLoading,
    isError: itemsError,
    refetch: refetchItems,
  } = activeContent ? workResult : feed;
  const items = useMemo(() => (activeContent ? workResult.data ?? [] : feed.items), [activeContent, workResult.data, feed.items]);
  const moreOnServer = !activeContent && !!feed.hasNextPage;
  const { data: allTags = [] } = useTags(selectedContent);
  const { data: catalogContents } = useCatalogContents();
  const contentCounts = useMemo(() => new Map((catalogContents ?? []).map((c) => [c.name, c.count])), [catalogContents]);

  // キャラは作品ごとのタグなので、作品を変えたら外す
  useEffect(() => {
    setChipFilter((f) => (f.character ? { ...f, character: null } : f));
  }, [activeContent]);

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
    let refetchTimer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel('official-items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'official_items' }, () => {
        // まとめて登録されると変更通知が大量に届く。全件を取り直すので、静まってから1回だけ再取得する
        if (refetchTimer) clearTimeout(refetchTimer);
        refetchTimer = setTimeout(() => { queryClient.invalidateQueries({ queryKey: ['official-items'] }); queryClient.invalidateQueries({ queryKey: ['catalog-content-counts'] }); }, 3000);
      })
      .subscribe();
    return () => {
      if (refetchTimer) clearTimeout(refetchTimer);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // この画面はグッズのカタログだけにした。以前のタブは、それぞれの置き場所へ送る
  const legacyTab = searchParams.get("tab");
  const currentTab = "goods";

  // ユーザーの興味のあるコンテンツをデフォルトで設定
  useEffect(() => {
    if (profile?.interests && Array.isArray(profile.interests) && profile.interests.length > 0 && !selectedContent && currentTab === "goods") {
      const firstInterestItem = profile.interests[0];
      let firstInterest: string;
      if (typeof firstInterestItem === 'string') {
        firstInterest = firstInterestItem;
      } else if (firstInterestItem && typeof firstInterestItem === 'object' && 'name' in firstInterestItem) {
        firstInterest = (firstInterestItem as { name: string }).name;
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

  // キーワード・タグ・作品で絞った一覧（チップの件数はここから数える）
  const baseItems = useMemo(() => {
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

  const filteredItems = useMemo(
    () => (isChipFilterActive(chipFilter) ? baseItems.filter((item) => matchesChipFilter(item, chipFilter)) : baseItems),
    [baseItems, chipFilter]
  );
  const chipCounts = useMemo(() => countChipFacets(baseItems, chipFilter), [baseItems, chipFilter]);
  // 図鑑表示（未所持だけ・発売年・シリーズ別）。チップで絞った後の一覧にさらに重ねる。URL の missing / year / view に残す
  const zukan = useZukanView(filteredItems, activeContent);

  const activeFilterCount = useMemo(
    () => (selectedContent && selectedContent !== "all" ? 1 : 0) + selectedTags.length,
    [selectedContent, selectedTags]
  );

  // 推しの作品（興味・推しグッズとして設定した作品）をチップ・一覧の先頭に出す。並べ替えのみで、他の作品は隠さない
  const orderedContentNames = useMemo(() => {
    const favorites = [...new Set([...(profile?.favorite_contents ?? []), ...(profile?.interests ?? [])])] as string[];
    if (favorites.length === 0) return contentNames;
    const rank = new Map(favorites.map((name, i) => [name, i]));
    return [...contentNames].sort((a, b) => {
      const ra = rank.get(a.name) ?? Number.POSITIVE_INFINITY;
      const rb = rank.get(b.name) ?? Number.POSITIVE_INFINITY;
      return ra !== rb ? ra - rb : a.name.localeCompare(b.name);
    });
  }, [contentNames, profile]);

  const clearAllFilters = useCallback(() => {
    setSelectedContent("all");
    setSelectedTags([]);
    setChipFilter({});
  }, []);

  if (legacyTab === "trade") return <Navigate to="/trade" replace />;
  if (legacyTab === "friends" || legacyTab === "collections") return <Navigate to="/explore?tab=users" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-2 pt-4 pb-nav sm:px-4 sm:pt-6 sm:pb-8">
        <div className="space-y-3 sm:space-y-6">
          <Tabs value="goods" className="w-full">
            <header className="mx-auto max-w-lg px-1 pb-1">
              <h1 className="flex items-center gap-2 text-xl font-bold">
                <Package className="h-5 w-5 text-primary" aria-hidden="true" />
                {t("screens.search.catalogTitle")}
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("screens.search.catalogSub")}</p>
            </header>

            {/* グッズ検索タブ - コンパクトフィルター */}
            <TabsContent value="goods" className="space-y-3">
              {/* 検索バー + フィルターボタン */}
              <div data-tour="search-input" className="flex items-center gap-2 bg-background py-2">
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
                  className="tap-safe-y shrink-0 h-9 w-9"
                  title={t("screens.search.searchByPhoto")}
                  aria-label={t("screens.search.searchByPhoto")}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className="tap-safe-y shrink-0 h-9 w-9 relative"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-3xs flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </div>

              {/* 作品 → キャラ → カテゴリ → 入手方法 の絞り込みチップ（作品はここで選ぶので、下の選択中チップには出さない） */}
              <CatalogFilterChips
                contents={orderedContentNames}
                contentCounts={contentCounts}
                selectedContent={selectedContent}
                onContentChange={setSelectedContent}
                filter={chipFilter}
                onFilterChange={setChipFilter}
                counts={chipCounts}
                countsComplete={!!activeContent && !workResult.isPlaceholderData && !workResult.isLoading && !workResult.isError}
                canReset={!!activeContent || isChipFilterActive(chipFilter) || selectedTags.length > 0}
                onReset={clearAllFilters}
              />

              {/* アクティブフィルターチップ（キーワード欄・フィルターで選んだタグ） */}
              {selectedTags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap px-1">
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

              <ZukanPanel zukan={zukan} content={activeContent} contentItems={activeContent && !workResult.isPlaceholderData ? workResult.data : undefined} />

              <div data-tour="search-results">
              <OfficialItemsList
                items={zukan.items}
                seriesView={zukan.seriesView}
                ownedIds={zukan.ownedIds}
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
              </div>
              {moreOnServer && (
                <div className="flex justify-center py-3">
                  <Button variant="outline" size="sm" disabled={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()}>
                    {feed.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : t("engage.catalog.loadMore", { n: FEED_PAGE })}
                  </Button>
                </div>
              )}

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
                        contentNames={orderedContentNames}
                      />
                    </ScrollArea>
                  </div>
                </DrawerContent>
              </Drawer>
            </TabsContent>

          </Tabs>
        </div>
      </main>
      
      {/* 以前はここに「📷追加」の浮きボタンがあり、下タブ中央の＋と2つ並んでいた。追加は下タブの＋に一本化する */}
      <Footer />
    </div>
  );
};

export default Search;
