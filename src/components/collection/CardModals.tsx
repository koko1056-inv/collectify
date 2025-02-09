
import { ItemMemoriesModal } from "@/components/ItemMemoriesModal";
import { TagManageModal } from "@/components/tag/TagManageModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ItemDetailsModal } from "../ItemDetailsModal";

interface CardModalsProps {
  itemId: string;
  itemTitle: string;
  userId?: string;
  image: string;
  releaseDate?: string;
  prize?: string;
  quantity?: number;
  purchaseDate?: string;
  purchasePrice?: string;
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
  purchaseDate,
  purchasePrice,
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
            <AlertDialogTitle>コレクションの削除</AlertDialogTitle>
            <AlertDialogDescription>
              このコレクションを削除してもよろしいですか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteConfirm}
              className="bg-red-500 hover:bg-red-600"
            >
              削除
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
        purchaseDate={purchaseDate}
        purchasePrice={purchasePrice}
        itemId={itemId}
        isUserItem={true}
      />
    </>
  );
}
