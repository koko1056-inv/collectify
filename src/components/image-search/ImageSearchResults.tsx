
import { OfficialItem } from "@/types/index";
import { OfficialGoodsCard } from "../OfficialGoodsCard";

interface ImageSearchResultsProps {
  detectedObjects?: string[];
  caption?: string;
  items?: OfficialItem[];
  isLoading?: boolean;
}

export function ImageSearchResults({ 
  detectedObjects = [], 
  caption = "", 
  items = [],
  isLoading = false
}: ImageSearchResultsProps) {
  if (isLoading) {
    return <div className="text-center p-4">検索中...</div>;
  }

  return (
    <div className="space-y-6">
      {(detectedObjects.length > 0 || caption) && (
        <div className="bg-gray-100 p-4 rounded-lg">
          {caption && (
            <div className="mb-2">
              <h3 className="font-medium text-sm">画像の説明:</h3>
              <p className="text-sm">{caption}</p>
            </div>
          )}
          
          {detectedObjects.length > 0 && (
            <div>
              <h3 className="font-medium text-sm">検出されたオブジェクト:</h3>
              <div className="flex flex-wrap gap-1 mt-1">
                {detectedObjects.map((obj, index) => (
                  <span key={index} className="bg-gray-200 text-xs px-2 py-1 rounded">
                    {obj}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {items && items.length > 0 ? (
        <div>
          <h2 className="text-xl font-bold mb-4">類似アイテム</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {items.map((item) => (
              <OfficialGoodsCard key={item.id} officialItem={item} />
            ))}
          </div>
        </div>
      ) : detectedObjects.length > 0 || caption ? (
        <div className="text-center p-4">
          <p className="text-gray-500">類似アイテムは見つかりませんでした</p>
        </div>
      ) : null}
    </div>
  );
}
