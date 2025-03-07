
import { OfficialItem } from "@/types";
import { OfficialGoodsCard } from "@/components/OfficialGoodsCard";

interface ImageSearchResultsProps {
  results: OfficialItem[];
  isLoading: boolean;
}

export function ImageSearchResults({ results, isLoading }: ImageSearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">検索結果がありません</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {results.map((item) => (
        <OfficialGoodsCard key={item.id} item={item} />
      ))}
    </div>
  );
}
