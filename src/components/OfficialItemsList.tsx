import { OfficialGoodsCard } from "@/components/OfficialGoodsCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { OfficialItem } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useMemo, memo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OfficialItemsListProps {
  items: OfficialItem[];
}

type SortOption = "newest" | "oldest" | "wishlist" | "owners";

const MemoizedOfficialGoodsCard = memo(OfficialGoodsCard);

export function OfficialItemsList({ items }: OfficialItemsListProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  
  const itemsPerPage = isMobile ? 21 : 24;

  const { data: wishlistCounts = {} } = useQuery({
    queryKey: ["wishlist-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("official_item_id")
        .select("count(*)")
        .groupBy("official_item_id");

      if (error) throw error;
      
      return data.reduce((acc: Record<string, number>, curr) => {
        acc[curr.official_item_id] = Number(curr.count);
        return acc;
      }, {});
    },
  });

  const { data: ownerCounts = {} } = useQuery({
    queryKey: ["owner-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select("official_item_id")
        .select("count(*)")
        .groupBy("official_item_id");

      if (error) throw error;
      
      return data.reduce((acc: Record<string, number>, curr) => {
        acc[curr.official_item_id] = Number(curr.count);
        return acc;
      }, {});
    },
  });
  
  const { totalPages, currentItems, pageNumbers } = useMemo(() => {
    // Sort items based on selected option
    const sortedItems = [...items].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "wishlist": {
          const wishlistCountA = wishlistCounts[a.id] || 0;
          const wishlistCountB = wishlistCounts[b.id] || 0;
          return wishlistCountB - wishlistCountA;
        }
        case "owners": {
          const ownerCountA = ownerCounts[a.id] || 0;
          const ownerCountB = ownerCounts[b.id] || 0;
          return ownerCountB - ownerCountA;
        }
        default:
          return 0;
      }
    });

    const total = Math.ceil(sortedItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const current = sortedItems.slice(startIndex, endIndex);
    const pages = Array.from({ length: total }, (_, i) => i + 1);
    
    return {
      totalPages: total,
      currentItems: current,
      pageNumbers: pages,
    };
  }, [items, currentPage, itemsPerPage, sortBy, wishlistCounts, ownerCounts]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold animate-fade-in text-gray-900">
            公式グッズ
          </h1>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="並び順を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">新しい順</SelectItem>
              <SelectItem value="oldest">古い順</SelectItem>
              <SelectItem value="wishlist">ウィッシュリスト登録数順</SelectItem>
              <SelectItem value="owners">保有者数順</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={() => navigate("/add-item")}
          className="bg-gray-900 hover:bg-gray-800 text-sm"
          size="sm"
        >
          新規追加
        </Button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 sm:gap-4 px-1 sm:px-2">
        {currentItems.map((item) => (
          <MemoizedOfficialGoodsCard
            key={item.id}
            id={item.id}
            title={item.title}
            image={item.image}
            artist={item.artist}
            anime={item.anime}
            price={item.price}
            releaseDate={item.release_date}
          />
        ))}
      </div>
      
      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            {pageNumbers.map((pageNum) => (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  onClick={() => setCurrentPage(pageNum)}
                  isActive={currentPage === pageNum}
                  className={`cursor-pointer ${currentPage === pageNum ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}`}
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            ))}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}