
import { OfficialItem } from "@/types";
import { useState, useRef, useEffect, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { OfficialItemsHeader } from "./official-goods/OfficialItemsHeader";
import { OfficialItemsGrid } from "./official-goods/OfficialItemsGrid";
import { useItemCounts } from "./official-goods/hooks/useItemCounts";
import { useSortedItems } from "./official-goods/hooks/useSortedItems";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
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
  const filterBarRef = useRef<HTMLDivElement>(null);
  
  // スクロールに関する状態を管理
  const [scrollY, setScrollY] = useState(0);
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const lastScrollY = useRef(0);
  
  // スクロール監視
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDirection = currentScrollY > lastScrollY.current ? 'down' : 'up';
      
      // 少しスクロールしたらフィルターを隠す/表示する閾値（ピクセル単位）
      const scrollThreshold = 10;
      
      // 上方向のスクロール、または先頭付近では常にフィルターを表示
      if (scrollDirection === 'up' || currentScrollY < 50) {
        setIsFilterVisible(true);
      } 
      // 十分な量の下スクロールがあればフィルターを隠す
      else if (scrollDirection === 'down' && 
               currentScrollY > 50 && 
               Math.abs(currentScrollY - lastScrollY.current) > scrollThreshold) {
        setIsFilterVisible(false);
      }
      
      // スクロール位置を更新
      setScrollY(currentScrollY);
      lastScrollY.current = currentScrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
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
  
  // フィルターバーのスタイル計算
  const filterBarStyle = {
    transform: isFilterVisible ? 'translateY(0)' : 'translateY(-100%)',
    position: 'sticky',
    top: isMobile ? '10px' : '64px', // モバイルの場合は上部に大きく寄せる (48pxから10pxに変更)
    zIndex: 30,
    transition: 'transform 0.3s ease',
    background: 'rgb(249, 250, 251)',
    borderBottom: scrollY > 50 ? '1px solid rgb(229, 231, 235)' : 'none',
    boxShadow: scrollY > 50 && isFilterVisible ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
  } as React.CSSProperties;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div 
        ref={filterBarRef}
        style={filterBarStyle}
        className="pb-2 pt-2"
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
