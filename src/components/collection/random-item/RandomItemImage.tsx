
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";

interface RandomItemImageProps {
  image: string;
  title: string;
  isSpinning: boolean;
  isLoading: boolean;
  onClick: () => void;
}

export function RandomItemImage({ image, title, isSpinning, isLoading, onClick }: RandomItemImageProps) {
  if (isLoading) {
    return (
      <div className={`h-48 w-48 rounded-md flex items-center justify-center ${isSpinning ? "animate-spin" : ""}`}>
        <Skeleton className="h-full w-full rounded-md" />
      </div>
    );
  }

  return (
    <div 
      className={`w-full max-w-[240px] mx-auto cursor-pointer transition-all duration-500 ${isSpinning ? "animate-spin" : "hover:scale-105"}`}
      onClick={onClick}
    >
      <AspectRatio ratio={1} className="bg-gray-50 rounded-md overflow-hidden">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-contain rounded-md animate-scale-in"
        />
      </AspectRatio>
    </div>
  );
}
