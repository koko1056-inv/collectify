
import { Card } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { CollectionGoodsCardHeader } from "./CollectionGoodsCardHeader";
import { CollectionGoodsCardFooter } from "./CollectionGoodsCardFooter";
import { useState, useCallback } from "react";
import { CollectionGoodsCardModals } from "./CollectionGoodsCardModals";
import { QuantityEditModal } from "./QuantityEditModal";
import { UserItemDetailsModal } from "@/components/item-details/UserItemDetailsModal";

interface CollectionGoodsCardProps {
  title: string;
  image: string;
  id: string;
  isShared?: boolean;
  userId?: string;
  releaseDate?: string;
  prize?: string;
  quantity?: number;
  isCompact?: boolean;
  memories?: any[];
}

export function CollectionGoodsCardWrapper({
  title,
  image,
  id,
  isShared = false,
  userId,
  releaseDate,
  prize,
  quantity = 1,
  isCompact = false,
  memories = []
}: CollectionGoodsCardProps) {
  const [isItemDetailsOpen, setIsItemDetailsOpen] = useState(false);
  const [isMemoriesModalOpen, setIsMemoriesModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [isQuantityEditOpen, setIsQuantityEditOpen] = useState(false);

  const handleMemoriesClick = useCallback(() => {
    setIsMemoriesModalOpen(true);
  }, []);

  const handleTagManageClick = useCallback(() => {
    setIsTagModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback(() => {
    setIsDeleteConfirmOpen(true);
  }, []);

  const handleCreatePostClick = useCallback(() => {
    setIsCreatePostModalOpen(true);
  }, []);

  const handleCardClick = useCallback(() => {
    setIsItemDetailsOpen(true);
  }, []);

  const handleQuantityClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsQuantityEditOpen(true);
  }, []);

  return <>
      <Card
        className="group relative bg-card border border-border/60 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
        onClick={handleCardClick}
      >
        <CardHeader className="p-0">
          <CollectionGoodsCardHeader title={title} image={image} quantity={quantity} />
        </CardHeader>
        <CardContent className="px-2.5 pt-2 pb-1">
          <h3 className="font-medium text-foreground text-xs leading-tight line-clamp-2 min-h-[2.2em]">{title}</h3>
        </CardContent>

        <CollectionGoodsCardFooter id={id} onMemoriesClick={handleMemoriesClick} onTagManageClick={handleTagManageClick} onDeleteClick={handleDeleteClick} onCreatePostClick={handleCreatePostClick} />
      </Card>

      {/* ユーザーアイテム詳細モーダル */}
      <UserItemDetailsModal
        isOpen={isItemDetailsOpen}
        onClose={() => setIsItemDetailsOpen(false)}
        itemId={id}
        title={title}
        image={image}
      />

      <CollectionGoodsCardModals isMemoriesModalOpen={isMemoriesModalOpen} setIsMemoriesModalOpen={setIsMemoriesModalOpen} isTagModalOpen={isTagModalOpen} setIsTagModalOpen={setIsTagModalOpen} isDeleteConfirmOpen={isDeleteConfirmOpen} setIsDeleteConfirmOpen={setIsDeleteConfirmOpen} isCreatePostModalOpen={isCreatePostModalOpen} setIsCreatePostModalOpen={setIsCreatePostModalOpen} id={id} title={title} image={image} />

      <QuantityEditModal 
        isOpen={isQuantityEditOpen}
        onClose={() => setIsQuantityEditOpen(false)}
        itemId={id}
        initialQuantity={quantity}
        itemTitle={title}
      />
    </>;
}
