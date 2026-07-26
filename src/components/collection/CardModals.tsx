import { ItemMemoriesModal } from "@/components/ItemMemoriesModal";
import { TagManageModal } from "@/components/tag/TagManageModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ItemDetailsModal } from "../ItemDetailsModal";
import { useLanguage } from "@/contexts/LanguageContext";

interface CardModalsProps {
  itemId: string;
  itemTitle: string;
  userId?: string;
  image: string;
  releaseDate?: string;
  prize?: string;
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
  const { t } = useLanguage();
  return (
    <>
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
        isUserItem={true}
      />
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={onDeleteClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("collectionScreen.deleteCollection.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("collectionScreen.deleteCollection.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("collectionScreen.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteConfirm}
              className="bg-red-500 hover:bg-red-600"
            >
              {t("collectionScreen.common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ItemDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={onDetailsClose}
        title={itemTitle}
        image={image}
        price={prize}
        releaseDate={releaseDate}
        quantity={quantity}
        itemId={itemId}
        isUserItem={true}
      />
    </>
  );
}