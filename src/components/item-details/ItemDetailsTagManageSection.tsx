
import { TagManageModal } from "../tag/TagManageModal";

interface ItemDetailsTagManageSectionProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
  isUserItem: boolean;
}

export function ItemDetailsTagManageSection({
  isOpen,
  onClose,
  itemId,
  itemTitle,
  isUserItem,
}: ItemDetailsTagManageSectionProps) {
  return (
    <TagManageModal
      isOpen={isOpen}
      onClose={onClose}
      itemIds={[itemId]}
      itemTitle={itemTitle}
      isUserItem={isUserItem}
    />
  );
}
