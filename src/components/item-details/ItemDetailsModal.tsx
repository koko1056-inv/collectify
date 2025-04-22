
import { Dialog } from "@/components/ui/dialog";
import { useState } from "react";
import { TagManageModal } from "../tag/TagManageModal";
import { ItemDetailsModalContent } from "./ItemDetailsModalContent";
import { ItemDetailsDeleteConfirm } from "./ItemDetailsDeleteConfirm";

interface ItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  image: string;
  price?: string;
  releaseDate?: string;
  description?: string;
  itemId: string;
  isUserItem?: boolean;
  quantity?: number;
  userId?: string;
  createdBy?: string | null;
  contentName?: string | null;
}

export function ItemDetailsModal({
  isOpen,
  onClose,
  title,
  image,
  price,
  releaseDate = new Date().toISOString().split('T')[0],
  description,
  itemId,
  isUserItem = false,
  quantity = 1,
  userId,
  createdBy,
  contentName,
}: ItemDetailsModalProps) {
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <ItemDetailsModalContent
          title={title}
          image={image}
          itemId={itemId}
          price={price}
          releaseDate={releaseDate}
          description={description}
          isUserItem={isUserItem}
          quantity={quantity}
          userId={userId}
          createdBy={createdBy}
          contentName={contentName}
          onClose={onClose}
          setIsDeleteConfirmOpen={setIsDeleteConfirmOpen}
          setIsTagModalOpen={setIsTagModalOpen}
        />
      </Dialog>

      <ItemDetailsDeleteConfirm
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        itemId={itemId}
        title={title}
        onConfirm={onClose}
      />

      <TagManageModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        itemIds={[itemId]}
        itemTitle={title}
        isUserItem={isUserItem}
      />
    </>
  );
}
