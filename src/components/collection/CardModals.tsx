import { ItemMemoriesModal } from "../ItemMemoriesModal";
import { TagManageModal } from "../tag/TagManageModal";
import { ShareModal } from "../ShareModal";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { ItemDetailsModal } from "../ItemDetailsModal";

interface CardModalsProps {
  isMemoriesModalOpen: boolean;
  isTagManageModalOpen: boolean;
  isDeleteDialogOpen: boolean;
  isShareModalOpen: boolean;
  isDetailsModalOpen: boolean;
  onMemoriesClose: () => void;
  onTagManageClose: () => void;
  onDeleteClose: (value: boolean) => void;
  onShareClose: () => void;
  onDetailsClose: () => void;
  onDeleteConfirm: () => void;
  itemId: string;
  itemTitle: string;
  userId?: string;
  image: string;
  releaseDate?: string;
  prize?: string;
  description?: string;
  quantity?: number;
}

export function CardModals({
  isMemoriesModalOpen,
  isTagManageModalOpen,
  isDeleteDialogOpen,
  isShareModalOpen,
  isDetailsModalOpen,
  onMemoriesClose,
  onTagManageClose,
  onDeleteClose,
  onShareClose,
  onDetailsClose,
  onDeleteConfirm,
  itemId,
  itemTitle,
  userId,
  image,
  releaseDate,
  prize,
  description,
  quantity,
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
      />

      <ItemMemoriesModal
        isOpen={isMemoriesModalOpen}
        onClose={onMemoriesClose}
        itemId={itemId}
        itemTitle={itemTitle}
        userId={userId}
      />

      <TagManageModal
        isOpen={isTagManageModalOpen}
        onClose={onTagManageClose}
        itemId={itemId}
        itemTitle={itemTitle}
        isUserItem={true}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={onShareClose}
        title={itemTitle}
        url={window.location.href}
        image={image}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={onDeleteClose}
        onConfirm={onDeleteConfirm}
      />
    </>
  );
}