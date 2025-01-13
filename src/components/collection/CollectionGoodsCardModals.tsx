import { ItemMemoriesModal } from "../ItemMemoriesModal";
import { TagManageModal } from "../tag/TagManageModal";
import { ShareModal } from "../ShareModal";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { ItemDetailsModal } from "../ItemDetailsModal";

interface CollectionGoodsCardModalsProps {
  id: string;
  title: string;
  image: string;
  userId?: string;
  releaseDate?: string;
  prize?: string;
  quantity?: number;
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
  shareUrl: string;
}

export function CollectionGoodsCardModals({
  id,
  title,
  image,
  userId,
  releaseDate,
  prize,
  quantity,
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
  shareUrl,
}: CollectionGoodsCardModalsProps) {

  return (
    <>
      <ItemDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={onDetailsClose}
        title={title}
        image={image}
        price={prize}
        releaseDate={releaseDate}
        itemId={id}
        isUserItem={true}
        quantity={quantity}
        userId={userId}
      />

      <ItemMemoriesModal
        isOpen={isMemoriesModalOpen}
        onClose={onMemoriesClose}
        itemIds={[id]}
        itemTitles={[title]}
        userId={userId}
      />

      <TagManageModal
        isOpen={isTagManageModalOpen}
        onClose={onTagManageClose}
        itemIds={[id]}
        itemTitle={title}
        isUserItem={true}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={onShareClose}
        title={title}
        url={shareUrl}
        image={image}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={onDeleteClose}
        onConfirm={() => {}}
      />
    </>
  );
}