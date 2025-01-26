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
} from "@/components/ui/pagination";

interface OfficialItemsListProps {
  items: OfficialItem[];
}

const MemoizedOfficialGoodsCard = memo(OfficialGoodsCard);

export function OfficialItemsList({ items }: OfficialItemsListProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = isMobile ? 21 : 24;
  
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center mb-4 px-2">
        <h1 className="text-2xl font-bold animate-fade-in text-gray-900">
          公式グッズ
        </h1>
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
            content={item.content}
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