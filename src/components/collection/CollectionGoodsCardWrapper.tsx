import { useState } from "react";
import { Card } from "@/components/ui/card";
import { CardImage } from "./CardImage";
import { CardModals } from "./CardModals";
import { Badge } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/card";

interface CollectionGoodsCardWrapperProps {
  title: string;
  image: string;
  id: string;
  userId?: string;
  releaseDate?: string;
  prize?: string;
  quantity?: number;
  isCompact?: boolean;
}

export function CollectionGoodsCardWrapper({
  title,
  image,
  id,
  userId,
  releaseDate,
  prize,
  quantity = 1,
  isCompact = false,
}: CollectionGoodsCardWrapperProps) {
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isMemoriesModalOpen, setIsMemoriesModalOpen] = useState(false);
  const [isTagManageModalOpen, setIsTagManageModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <Card 
      className="hover-scale card-shadow bg-white border border-gray-200 cursor-pointer relative overflow-hidden"
      onClick={() => setIsDetailsModalOpen(true)}
    >
      {quantity > 1 && (
        <Badge 
          className="absolute top-2 right-2 z-10 bg-purple-500 hover:bg-purple-500"
        >
          ×{quantity}
        </Badge>
      )}
      <CardImage title={title} image={image} />
      <div className="px-3 py-2">
        <CardTitle className="text-base line-clamp-1 text-gray-900">{title}</CardTitle>
      </div>
      <CardModals
        itemId={id}
        itemTitle={title}
        userId={userId}
        image={image}
        releaseDate={releaseDate}
        prize={prize}
        quantity={quantity}
        isMemoriesModalOpen={isMemoriesModalOpen}
        isTagManageModalOpen={isTagManageModalOpen}
        isDeleteDialogOpen={isDeleteDialogOpen}
        isDetailsModalOpen={isDetailsModalOpen}
        onMemoriesClose={() => setIsMemoriesModalOpen(false)}
        onTagManageClose={() => setIsTagManageModalOpen(false)}
        onDeleteClose={setIsDeleteDialogOpen}
        onDetailsClose={() => setIsDetailsModalOpen(false)}
        onDeleteConfirm={() => {}}
      />
    </Card>
  );
}