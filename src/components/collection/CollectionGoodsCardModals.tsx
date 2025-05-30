
import { ItemMemoriesModal } from "@/components/ItemMemoriesModal";
import { ItemDetailsDeleteDialog } from "@/components/item-details/ItemDetailsDeleteDialog";
import { ItemDetailsTagManageSection } from "@/components/item-details/ItemDetailsTagManageSection";
import { CreatePostModal } from "@/components/posts/CreatePostModal";

interface CollectionGoodsCardModalsProps {
  isMemoriesModalOpen: boolean;
  setIsMemoriesModalOpen: (open: boolean) => void;
  isTagModalOpen: boolean;
  setIsTagModalOpen: (open: boolean) => void;
  isDeleteConfirmOpen: boolean;
  setIsDeleteConfirmOpen: (open: boolean) => void;
  isCreatePostModalOpen: boolean;
  setIsCreatePostModalOpen: (open: boolean) => void;
  id: string;
  title: string;
  image: string;
}

export function CollectionGoodsCardModals({
  isMemoriesModalOpen,
  setIsMemoriesModalOpen,
  isTagModalOpen,
  setIsTagModalOpen,
  isDeleteConfirmOpen,
  setIsDeleteConfirmOpen,
  isCreatePostModalOpen,
  setIsCreatePostModalOpen,
  id,
  title,
  image,
}: CollectionGoodsCardModalsProps) {
  return (
    <>
      <ItemMemoriesModal
        isOpen={isMemoriesModalOpen}
        onClose={() => setIsMemoriesModalOpen(false)}
        itemIds={[id]}
        itemTitles={[title]}
      />

      <ItemDetailsTagManageSection
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        itemId={id}
        itemTitle={title}
        isUserItem
      />

      <ItemDetailsDeleteDialog
        open={isDeleteConfirmOpen}
        setOpen={setIsDeleteConfirmOpen}
        title={title}
        itemId={id}
        isUserItem
        onCloseModal={() => setIsDeleteConfirmOpen(false)}
      />
      
      <CreatePostModal
        isOpen={isCreatePostModalOpen}
        onClose={() => setIsCreatePostModalOpen(false)}
        userItemId={id}
        userItemTitle={title}
        userItemImage={image}
      />
    </>
  );
}
