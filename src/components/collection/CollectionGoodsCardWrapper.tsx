import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CollectionGoodsCardHeader } from "./CollectionGoodsCardHeader";
import { CollectionGoodsCardContent } from "./CollectionGoodsCardContent";
import { CollectionGoodsCardFooter } from "./CollectionGoodsCardFooter";
import { CollectionGoodsCardModals } from "./CollectionGoodsCardModals";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface CollectionGoodsCardWrapperProps {
  title: string;
  image: string;
  id: string;
  isShared?: boolean;
  userId?: string;
  releaseDate?: string;
  prize?: string;
  quantity?: number;
}

export function CollectionGoodsCardWrapper({
  title,
  image,
  id,
  isShared = false,
  userId,
  releaseDate = new Date().toISOString().split('T')[0],
  prize,
  quantity = 1
}: CollectionGoodsCardWrapperProps) {
  const { user } = useAuth();
  const [isMemoriesModalOpen, setIsMemoriesModalOpen] = useState(false);
  const [isTagManageModalOpen, setIsTagManageModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const isOwner = !userId || (user && user.id === userId);

  return (
    <>
      <Card 
        className="hover-scale card-shadow bg-white border border-gray-200 cursor-pointer relative"
        onClick={() => setIsDetailsModalOpen(true)}
      >
        {quantity > 1 && (
          <Badge 
            className="absolute top-2 right-2 z-10 bg-purple-500 hover:bg-purple-500"
          >
            ×{quantity}
          </Badge>
        )}
        <CollectionGoodsCardHeader title={title} image={image} />
        <div className="px-3 py-2">
          <h3 className="text-sm font-medium line-clamp-2 text-gray-900">{title}</h3>
        </div>
        <CollectionGoodsCardContent
          id={id}
          isOwner={isOwner}
          isShared={isShared}
          onMemoriesClick={() => setIsMemoriesModalOpen(true)}
        />
        {isOwner && (
          <CollectionGoodsCardFooter
            id={id}
            onMemoriesClick={() => setIsMemoriesModalOpen(true)}
            onTagManageClick={() => setIsTagManageModalOpen(true)}
            onShareClick={() => setIsShareModalOpen(true)}
            onDeleteClick={() => setIsDeleteDialogOpen(true)}
          />
        )}
      </Card>

      <CollectionGoodsCardModals
        id={id}
        title={title}
        image={image}
        userId={userId}
        releaseDate={releaseDate}
        prize={prize}
        quantity={quantity}
        isMemoriesModalOpen={isMemoriesModalOpen}
        isTagManageModalOpen={isTagManageModalOpen}
        isDeleteDialogOpen={isDeleteDialogOpen}
        isShareModalOpen={isShareModalOpen}
        isDetailsModalOpen={isDetailsModalOpen}
        onMemoriesClose={() => setIsMemoriesModalOpen(false)}
        onTagManageClose={() => setIsTagManageModalOpen(false)}
        onDeleteClose={setIsDeleteDialogOpen}
        onShareClose={() => setIsShareModalOpen(false)}
        onDetailsClose={() => setIsDetailsModalOpen(false)}
      />
    </>
  );
}