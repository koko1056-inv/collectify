import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardImage } from "./CardImage";
import { LikeButton } from "./LikeButton";

interface PublicCollectionGoodsCardProps {
  id: string;
  title: string;
  image: string;
  quantity?: number;
}

export function PublicCollectionGoodsCard({
  id,
  title,
  image,
  quantity = 1
}: PublicCollectionGoodsCardProps) {
  return (
    <Card className="hover-scale card-shadow bg-white border border-gray-200 cursor-pointer relative overflow-hidden">
      {quantity > 1 && (
        <Badge 
          className="absolute top-2 right-2 z-10 bg-purple-500 hover:bg-purple-500"
        >
          ×{quantity}
        </Badge>
      )}
      <div className="space-y-2">
        <CardImage 
          title={title} 
          image={image} 
          itemId={id}
          isEditable={false}
        />
        <div className="p-3 space-y-2">
          <h3 className="text-sm font-medium text-gray-900 truncate">{title}</h3>
          <div className="flex items-center gap-1.5">
            <LikeButton itemId={id} />
          </div>
        </div>
      </div>
    </Card>
  );
}