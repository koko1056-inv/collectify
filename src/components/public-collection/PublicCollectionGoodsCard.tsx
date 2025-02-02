import { Card as UICard, CardContent as UICardContent, CardHeader as UICardHeader } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import Image from "next/image";

interface PublicCollectionGoodsCardProps {
  id: string;
  title: string;
  image: string;
  userId?: string;
}

export function PublicCollectionGoodsCard({
  id,
  title,
  image,
  userId,
}: PublicCollectionGoodsCardProps) {
  return (
    <UICard className="overflow-hidden border border-gray-200 bg-white hover:shadow-md transition-shadow">
      <UICardHeader className="p-0">
        <AspectRatio ratio={1}>
          <img
            src={image}
            alt={title}
            className="object-cover w-full h-full"
          />
        </AspectRatio>
      </UICardHeader>
      <UICardContent className="p-2">
        <p className="text-sm font-medium truncate">{title}</p>
      </UICardContent>
    </UICard>
  );
}