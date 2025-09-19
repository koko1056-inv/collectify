
import { Card } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { CollectionGoodsCardHeader } from "./CollectionGoodsCardHeader";
import { CollectionGoodsCardFooter } from "./CollectionGoodsCardFooter";
import { useState, useCallback } from "react";
import { ItemDetailsModal } from "@/components/item-details/ItemDetailsModal";
import { CollectionGoodsCardModals } from "./CollectionGoodsCardModals";
import { QuantityEditModal } from "./QuantityEditModal";

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
      <Card className="hover-scale card-shadow bg-white border border-gray-200 cursor-pointer relative group" onClick={handleCardClick}>
        <CardHeader className="p-0">
          <CollectionGoodsCardHeader title={title} image={image} />
        </CardHeader>
        <CardContent className="p-2 relative">
          <h3 className="font-medium text-gray-900 truncate text-xs">{title}</h3>
          {quantity >= 1 && (
            <button 
              onClick={handleQuantityClick}
              className="absolute -top-6 right-1 bg-white border-2 border-blue-500 text-blue-500 font-semibold px-2 rounded-full text-xs shadow-sm py-0 my-0 md:-top-8 hover:bg-blue-50 transition-colors"
            >
              ×{quantity}
            </button>
          )}
        </CardContent>
        
        <CollectionGoodsCardFooter id={id} onMemoriesClick={handleMemoriesClick} onTagManageClick={handleTagManageClick} onDeleteClick={handleDeleteClick} onCreatePostClick={handleCreatePostClick} />
      </Card>

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
