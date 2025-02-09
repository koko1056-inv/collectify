
import { OfficialItem } from "@/types";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { OfficialItemsHeader } from "./official-goods/OfficialItemsHeader";
import { OfficialItemsGrid } from "./official-goods/OfficialItemsGrid";
import { useItemCounts } from "./official-goods/hooks/useItemCounts";
import { useSortedItems } from "./official-goods/hooks/useSortedItems";

interface OfficialItemsListProps {
  items: OfficialItem[];
}

type SortOption = "newest" | "oldest" | "wishlist" | "owners";

export function OfficialItemsList({ items }: OfficialItemsListProps) {
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  
  const itemsPerPage = isMobile ? 21 : 24;
  const { wishlistCounts, ownerCounts } = useItemCounts();
  const sortedItems = useSortedItems(items, sortBy, ownerCounts);

  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = sortedItems.slice(startIndex, endIndex);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="space-y-6 bg-white rounded-lg p-4 sm:p-6 shadow-sm">
      <OfficialItemsHeader sortBy={sortBy} onSortChange={setSortBy} />
      
      <div className="bg-gray-50 rounded-lg p-2 sm:p-4">
        <OfficialItemsGrid items={currentItems} />
      </div>
      
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationContent>
              {pageNumbers.map((pageNum) => (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => setCurrentPage(pageNum)}
                    isActive={currentPage === pageNum}
                    className={`cursor-pointer ${
                      currentPage === pageNum 
                        ? 'bg-gray-900 text-white hover:bg-gray-800' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              ))}
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
