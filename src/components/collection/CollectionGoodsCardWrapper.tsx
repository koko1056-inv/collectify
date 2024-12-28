import { useState } from "react";
import { Card } from "@/components/ui/card";
import { CardHeader } from "./CardHeader";
import { CollectionGoodsCardContent } from "./CollectionGoodsCardContent";
import { CardFooter } from "./CardFooter";
import { CardModals } from "./CardModals";
import { useCardEventHandlers } from "./CardEventHandlers";
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
  releaseDate,
  prize,
  quantity,
}: CollectionGoodsCardWrapperProps) {
  const [isMemoriesModalOpen, setIsMemoriesModalOpen] = useState(false);
  const [isTagManageModalOpen, setIsTagManageModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const { handleShareToggle, handleDelete } = useCardEventHandlers(id);
  const { user } = useAuth();
  const isOwner = !userId || (user && user.id === userId);

  const shareUrl = `${window.location.origin}/user/${userId || ""}`;

  return (
    <Card className="hover-scale card-shadow bg-white border border-gray-200">
      <CardHeader
        title={title}
        image={image}
        onClick={() => setIsDetailsModalOpen(true)}
      />
      <CollectionGoodsCardContent
        id={id}
        isOwner={isOwner}
        isShared={isShared}
        onMemoriesClick={() => setIsMemoriesModalOpen(true)}
      />
      {isOwner && (
        <CardFooter
          hasMemories={false}
          hasTags={false}
          onMemoriesClick={() => setIsMemoriesModalOpen(true)}
          onTagManageClick={() => setIsTagManageModalOpen(true)}
          onShareClick={() => setIsShareModalOpen(true)}
          onDeleteClick={() => setIsDeleteDialogOpen(true)}
        />
      )}
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
        isShareModalOpen={isShareModalOpen}
        isDetailsModalOpen={isDetailsModalOpen}
        onMemoriesClose={() => setIsMemoriesModalOpen(false)}
        onTagManageClose={() => setIsTagManageModalOpen(false)}
        onDeleteClose={setIsDeleteDialogOpen}
        onShareClose={() => setIsShareModalOpen(false)}
        onDetailsClose={() => setIsDetailsModalOpen(false)}
        onDeleteConfirm={handleDelete}
        shareUrl={shareUrl}
      />
    </Card>
  );
}