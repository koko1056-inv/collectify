
import { Skeleton } from "@/components/ui/skeleton";
import { RandomItemImage } from "./RandomItemImage";
import { RandomItemTags } from "./RandomItemTags";

interface RandomItemContentProps {
  randomItem: any | null;
  isLoading: boolean;
  isSpinning: boolean;
  onImageClick: () => void;
}

export function RandomItemContent({ 
  randomItem, 
  isLoading, 
  isSpinning, 
  onImageClick 
}: RandomItemContentProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className={`h-48 w-48 rounded-md flex items-center justify-center ${isSpinning ? "animate-spin" : ""}`}>
            <Skeleton className="h-full w-full rounded-md" />
          </div>
        </div>
        <Skeleton className="h-4 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
      </div>
    );
  }

  if (!randomItem) {
    return (
      <p className="text-center text-gray-500">
        コレクションにアイテムがありません。
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <RandomItemImage 
        image={randomItem.image}
        title={randomItem.title}
        isSpinning={isSpinning}
        isLoading={false}
        onClick={onImageClick}
      />
      <h3 className="font-bold text-lg text-center animate-fade-in">{randomItem.title}</h3>
      {randomItem.user_item_tags && Array.isArray(randomItem.user_item_tags) && (
        <RandomItemTags tags={randomItem.user_item_tags} />
      )}
    </div>
  );
}
