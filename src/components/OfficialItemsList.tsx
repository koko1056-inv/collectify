import { OfficialItem } from "@/types";
import { useState, useRef, useEffect, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { OfficialItemsHeader } from "./official-goods/OfficialItemsHeader";
import { OfficialItemsGrid } from "./official-goods/OfficialItemsGrid";
import { useItemCounts } from "./official-goods/hooks/useItemCounts";
import { useSortedItems } from "./official-goods/hooks/useSortedItems";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckSquare, X, Tags } from "lucide-react";
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

interface OfficialItemsListProps {
  items: OfficialItem[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  selectedTags?: string[];
  onTagsChange?: (tags: string[]) => void;
  selectedContent?: string;
  onContentChange?: (content: string) => void;
  tags?: Tag[];
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
  tags = []
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
  
  // 選択したタグでフィルタリングされたアイテムを取得
  const filteredByTagsItems = items.filter(item => {
    if (selectedTags.length === 0) return true;
    
    // タグの配列が実際に存在することを確認
    const itemTags = item.item_tags || [];
    
    // 選択したすべてのタグが、そのアイテムのタグに含まれているかをチェック
    return selectedTags.every(selectedTag => {
      return itemTags.some(itemTag => 
        itemTag.tags && itemTag.tags.name === selectedTag
      );
    });
  });
  
  console.log(`フィルタリング後のアイテム数: ${filteredByTagsItems.length} / ${items.length}`);
  console.log('選択されたタグ:', selectedTags);
  
  const sortedItems = useSortedItems(filteredByTagsItems, sortBy, ownerCounts);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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
            title: "全てのアイテムを表示しました",
            description: `${sortedItems.length}件のアイテムを表示しています。`,
          });
        }
        
        return Math.min(newCount, sortedItems.length);
      });
      setIsLoading(false);
    }, 500);
  }, [visibleCount, sortedItems.length, isMobile, isLoading, toast]);

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
      />
      
      <Drawer open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DrawerContent className="max-h-[90vh] px-4 pt-4 pb-8">
          <div className="mx-auto w-full max-w-sm">
            <DrawerTitle className="text-center font-medium mb-4">フィルター</DrawerTitle>
            <DrawerClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none">
              <button className="text-sm text-muted-foreground">
                完了
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
      
      <OfficialItemsGrid items={currentItems} />
      
      {visibleCount < sortedItems.length && (
        <div 
          ref={loaderRef} 
          className="flex justify-center items-center py-6"
        >
          {isLoading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">読み込み中...</p>
            </div>
          ) : (
            <div className="h-8" />
          )}
        </div>
      )}
    </div>
  );
}
