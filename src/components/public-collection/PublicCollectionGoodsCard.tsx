import { useState } from "react";
import { Card, CardContent as UICardContent, CardHeader as UICardHeader } from "@/components/ui/card";
import { CardHeader } from "../collection/CardHeader";
import { CollectionGoodsCardContent } from "../collection/CollectionGoodsCardContent";
import { PublicItemDetailsModal } from "./PublicItemDetailsModal";

interface PublicCollectionGoodsCardProps {
  title: string;
  image: string;
  id: string;
  userId?: string;
}

export function PublicCollectionGoodsCard({
  title,
  image,
  id,
}: PublicCollectionGoodsCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <>
      <Card className="hover-scale card-shadow bg-card border border-border cursor-pointer">
        <UICardHeader className="p-0">
          <CardHeader
            title={title}
            image={image}
            onClick={() => setIsDetailsOpen(true)}
            itemId={id}
            className="aspect-square"
          />
        </UICardHeader>
        <UICardContent
          className="p-3 space-y-1"
          onClick={() => setIsDetailsOpen(true)}
        >
          <h3 className="text-[10px] font-medium text-foreground truncate">
            {title}
          </h3>
          <CollectionGoodsCardContent
            id={id}
            isOwner={false}
            onMemoriesClick={() => setIsDetailsOpen(true)}
          />
        </UICardContent>
      </Card>

      <PublicItemDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        itemId={id}
        title={title}
        image={image}
      />
    </>
  );
}
