import { OfficialGoodsCard } from "@/components/OfficialGoodsCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { OfficialItem } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useMemo, memo } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface OfficialItemsListProps {
  items: OfficialItem[];
}

// Memoize OfficialGoodsCard to prevent unnecessary re-renders
const MemoizedOfficialGoodsCard = memo(OfficialGoodsCard);

export function OfficialItemsList({ items }: OfficialItemsListProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = isMobile ? 12 : 24;
  
  // Memoize calculations
  const { totalPages, currentItems, pageNumbers } = useMemo(() => {
    const total = Math.ceil(items.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const current = items.slice(startIndex, endIndex);
    const pages = Array.from({ length: total }, (_, i) => i + 1);
    
    return {
      totalPages: total,
      currentItems: current,
      pageNumbers: pages,
    };
  }, [items, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold animate-fade-in text-gray-900">
          公式グッズ
        </h1>
        <Button 
          onClick={() => navigate("/add-item")}
          className="bg-gray-900 hover:bg-gray-800"
        >
          新規アイテムを追加
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
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
        <Pagination className="mt-8">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            
            {pageNumbers.map((pageNum) => (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  onClick={() => setCurrentPage(pageNum)}
                  isActive={currentPage === pageNum}
                  className="cursor-pointer"
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            ))}
            
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}