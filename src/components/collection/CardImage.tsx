import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";

interface CardImageProps {
  image: string;
  title: string;
}

export function CardImage({ image, title }: CardImageProps) {
  const [objectFit, setObjectFit] = useState<"cover" | "contain">("cover");

  const toggleFit = () => {
    setObjectFit(prev => prev === "cover" ? "contain" : "cover");
  };

  return (
    <div className="aspect-square relative overflow-hidden rounded-t-lg group">
      <img
        src={image}
        alt={title}
        className={`w-full h-full transition-all duration-300 hover:scale-105 object-${objectFit}`}
      />
      <Button
        variant="secondary"
        size="icon"
        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white"
        onClick={toggleFit}
      >
        {objectFit === "cover" ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}