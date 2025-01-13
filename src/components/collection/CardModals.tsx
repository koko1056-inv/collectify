import { ItemMemoriesModal } from "../ItemMemoriesModal";
import { TagManageModal } from "../tag/TagManageModal";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { ItemDetailsModal } from "../ItemDetailsModal";

interface CardModalsProps {
  itemId: string;
  itemTitle: string;
  userId?: string;
  image: string;
  releaseDate?: string;
  prize?: string;
  description?: string;
  quantity?: number;
  isMemoriesModalOpen: boolean;
  isTagManageModalOpen: boolean;
  isDeleteDialogOpen: boolean;
  isDetailsModalOpen: boolean;
  onMemoriesClose: () => void;
  onTagManageClose: () => void;
  onDeleteClose: (value: boolean) => void;
  onDetailsClose: () => void;
  onDeleteConfirm: () => void;
}

export function CardModals({
  itemId,
  itemTitle,
  userId,
  image,
  releaseDate,
  prize,
  description,
  quantity,
  isMemoriesModalOpen,
  isTagManageModalOpen,
  isDeleteDialogOpen,
  isDetailsModalOpen,
  onMemoriesClose,
  onTagManageClose,
  onDeleteClose,
  onDetailsClose,
  onDeleteConfirm,
}: CardModalsProps) {
  return (
    <>
      <ItemDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={onDetailsClose}
        title={itemTitle}
        image={image}
        price={prize}
        releaseDate={releaseDate}
        description={description}
        itemId={itemId}
        isUserItem={true}
        quantity={quantity}
        userId={userId}
      />

      <ItemMemoriesModal
        isOpen={isMemoriesModalOpen}
        onClose={onMemoriesClose}
        itemIds={[itemId]}
        itemTitles={[itemTitle]}
        userId={userId}
      />

      <TagManageModal
        isOpen={isTagManageModalOpen}
        onClose={onTagManageClose}
        itemIds={[itemId]}
        itemTitle={itemTitle}
        isUserItem={true}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={onDeleteClose}
        onConfirm={onDeleteConfirm}
      />
    </>
  );
}