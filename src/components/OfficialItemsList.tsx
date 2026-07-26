import { OfficialItem } from "@/types";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { OfficialItemsHeader } from "./official-goods/OfficialItemsHeader";
import { OfficialItemsGrid } from "./official-goods/OfficialItemsGrid";
import { useItemCounts } from "./official-goods/hooks/useItemCounts";
import { useSortedItems } from "./official-goods/hooks/useSortedItems";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckSquare, X, Tags, Package } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { TagManageModal } from "./tag/TagManageModal";
import { 
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FilterBar } from "./FilterBar";
import { Tag } from "@/types";
import { Button } from "@/components/ui/button";
import { BulkImportModal } from "./admin/BulkImportModal";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface OfficialItemsListProps {
  items: OfficialItem[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  selectedTags?: string[];
  onTagsChange?: (tags: string[]) => void;
  selectedContent?: string;
  onContentChange?: (content: string) => void;
  tags?: Tag[];
  /** 初回データ取得中かどうか。true の間は空状態ではなくスケルトンを表示する。 */
  isInitialLoading?: boolean;
  /** 取得に失敗したかどうか。true なら空状態ではなくエラー表示にする。 */
  isError?: boolean;
  /** エラー表示の「再試行」で呼ばれる。 */
  onRetry?: () => void;
}

type SortOption = "newest" | "oldest" | "wishlist" | "owners-desc" | "owners-asc" | "not-owned";

export function OfficialItemsList({ 
  items,
  searchQuery = "",
  onSearchChange = () => {},
  selectedTags = [],
  onTagsChange = () => {},
  selectedContent = "",
  onContentChange = () => {},
  tags = [],
  isInitialLoading = false,
  isError = false,
  onRetry
}: OfficialItemsListProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [visibleCount, setVisibleCount] = useState(isMobile ? 21 : 24);
  const { wishlistCounts, ownerCounts } = useItemCounts();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkTagOpen, setIsBulkTagOpen] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);
  
  // 選択したタグでフィルタリングされたアイテムを取得（メモ化して再レンダー時の再計算を防ぐ）
  const filteredByTagsItems = useMemo(() => {
    if (selectedTags.length === 0) return items;
    return items.filter(item => {
      const itemTags = item.item_tags || [];
      return selectedTags.every(selectedTag =>
        itemTags.some(itemTag => itemTag.tags && itemTag.tags.name === selectedTag)
      );
    });
  }, [items, selectedTags]);
  
  const sortedItems = useSortedItems(filteredByTagsItems, sortBy, ownerCounts);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const loadMoreItems = useCallback(() => {
    if (visibleCount >= sortedItems.length || isLoading) return;
    
    setIsLoading(true);
    // 少し遅延を追加して、ロード感を演出
    setTimeout(() => {
      setVisibleCount(prev => {
        const increment = isMobile ? 21 : 24;
        const newCount = prev + increment;
        
        // 全アイテムを表示した場合は通知を表示
        if (newCount >= sortedItems.length) {
          toast({
            title: t("chrome.officialItems.allShownTitle"),
            description: t("chrome.officialItems.allShownDesc", { n: sortedItems.length }),
          });
        }
        
        return Math.min(newCount, sortedItems.length);
      });
      setIsLoading(false);
    }, 500);
  }, [visibleCount, sortedItems.length, isMobile, isLoading, toast, t]);

  useEffect(() => {
    // IntersectionObserverを使って無限スクロールを実装
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreItems();
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [loadMoreItems]);

  // ソート方法が変わった場合は表示数をリセット
  useEffect(() => {
    setVisibleCount(isMobile ? 21 : 24);
  }, [sortBy, isMobile]);

  const currentItems = sortedItems.slice(0, visibleCount);

  const handleFilterClick = () => {
    setIsFilterOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <OfficialItemsHeader
        sortBy={sortBy}
        onSortChange={setSortBy}
        totalItems={sortedItems.length}
        onFilterClick={handleFilterClick}
        showBulkImport={!!user}
        onBulkImportClick={() => setIsBulkImportOpen(true)}
        showSelectionMode={!!user}
        onSelectionModeClick={() => setSelectionMode(true)}
      />

      {user && selectionMode && (
        <div className="flex items-center justify-between gap-2 px-2 py-2 bg-muted/50 rounded-md">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={exitSelectionMode} className="h-8 px-2">
              <X className="h-4 w-4 mr-1" />
              {t("chrome.common.cancel")}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t("chrome.collection.selectedCount", { n: selectedIds.size })}
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setIsBulkTagOpen(true)}
            disabled={selectedIds.size === 0}
            className="h-8"
          >
            <Tags className="h-4 w-4 mr-1" />
            {t("chrome.officialItems.bulkTagEdit")}
          </Button>
        </div>
      )}
      
      <Drawer open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DrawerContent className="max-h-[90vh] px-4 pt-4 pb-8">
          <div className="mx-auto w-full max-w-sm">
            <DrawerTitle className="text-center font-medium mb-4">{t("chrome.filter.title")}</DrawerTitle>
            <DrawerClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none">
              <button className="text-sm text-muted-foreground">
                {t("chrome.officialItems.done")}
              </button>
            </DrawerClose>
            <ScrollArea className="h-[70vh] pr-4">
              <FilterBar
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                selectedTags={selectedTags}
                onTagsChange={onTagsChange}
                selectedContent={selectedContent}
                onContentChange={onContentChange}
                tags={tags}
              />
            </ScrollArea>
          </div>
        </DrawerContent>
      </Drawer>
      
      <BulkImportModal 
        isOpen={isBulkImportOpen} 
        onClose={() => setIsBulkImportOpen(false)} 
      />

      <TagManageModal
        isOpen={isBulkTagOpen}
        onClose={() => {
          setIsBulkTagOpen(false);
          exitSelectionMode();
        }}
        itemIds={Array.from(selectedIds)}
        isUserItem={false}
      />
      
      {isInitialLoading ? (
        // 取得完了前に空状態を出すと「グッズがありません」と誤解させてしまうため、
        // 読み込み中はグリッド形のスケルトンを表示する。
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        // 通信失敗を空状態で見せると「グッズが無い」と誤解されるため区別する
        <QueryErrorState
          title={t("chrome.officialItems.loadFailed")}
          onRetry={onRetry}
        />
      ) : sortedItems.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t("chrome.officialItems.emptyTitle")}
          description={t("chrome.collection.noMatchDesc")}
        />
      ) : (
        <OfficialItemsGrid
          items={currentItems}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      )}

      {visibleCount < sortedItems.length && (
        <div 
          ref={loaderRef} 
          className="flex justify-center items-center py-6"
        >
          {isLoading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">{t("chrome.common.loading")}</p>
            </div>
          ) : (
            <div className="h-8" />
          )}
        </div>
      )}
    </div>
  );
}
