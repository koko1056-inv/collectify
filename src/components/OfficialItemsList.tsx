
import { OfficialItem } from "@/types";
import { useState, useRef, useEffect, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { OfficialItemsHeader } from "./official-goods/OfficialItemsHeader";
import { OfficialItemsGrid } from "./official-goods/OfficialItemsGrid";
import { useItemCounts } from "./official-goods/hooks/useItemCounts";
import { useSortedItems } from "./official-goods/hooks/useSortedItems";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { 
  ScrollArea
} from "@/components/ui/scroll-area";
import { FilterBar } from "./FilterBar";
import { Tag } from "@/types";

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

type SortOption = "newest" | "oldest" | "wishlist" | "owners";

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
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [visibleCount, setVisibleCount] = useState(isMobile ? 21 : 24);
  const { wishlistCounts, ownerCounts } = useItemCounts();
  const [isScrolled, setIsScrolled] = useState(false);
  const filterBarRef = useRef<HTMLDivElement>(null);
  
  // スクロール監視
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div 
        ref={filterBarRef}
        className={`sticky top-16 sm:top-0 z-10 bg-gray-50 pb-2 transition-transform duration-300 ${
          isScrolled ? "transform translate-y-0" : "transform translate-y-0"
        }`}
      >
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          selectedTags={selectedTags}
          onTagsChange={onTagsChange}
          selectedContent={selectedContent}
          onContentChange={onContentChange}
          tags={tags}
        />
      </div>
      
      <OfficialItemsHeader 
        sortBy={sortBy} 
        onSortChange={setSortBy} 
        totalItems={sortedItems.length}
      />
      
      <OfficialItemsGrid items={currentItems} />
      
      {visibleCount < sortedItems.length && (
        <div 
          ref={loaderRef} 
          className="flex justify-center items-center py-6"
        >
          {isLoading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              <p className="text-sm text-gray-500 mt-2">読み込み中...</p>
            </div>
          ) : (
            <div className="h-8" />
          )}
        </div>
      )}
    </div>
  );
}
