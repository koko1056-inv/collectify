import { OfficialGoodsCard } from "@/components/OfficialGoodsCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { OfficialItem } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
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

export function OfficialItemsList({ items }: OfficialItemsListProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  
  // Increased items per page for both mobile and desktop
  const itemsPerPage = isMobile ? 12 : 24;
  
  // Calculate total pages
  const totalPages = Math.ceil(items.length / itemsPerPage);
  
  // Calculate start and end index for current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  // Get items for current page
  const currentItems = items.slice(startIndex, endIndex);

  // Generate page numbers array
  const getPageNumbers = () => {
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  };

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
          <OfficialGoodsCard
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
            
            {getPageNumbers().map((pageNum) => (
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