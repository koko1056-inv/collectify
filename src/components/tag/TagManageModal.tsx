import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TagInputField } from "./TagInputField";
import { ExistingTags } from "./ExistingTags";
import { CurrentTags } from "./CurrentTags";

interface TagManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemIds: string[];
  itemTitle?: string;
  isUserItem?: boolean;
  isCategory?: boolean;
}

export function TagManageModal({ 
  isOpen, 
  onClose, 
  itemIds = [],
  itemTitle,
  isUserItem = false,
  isCategory = false 
}: TagManageModalProps) {
  const title = itemIds.length === 1 
    ? `${isCategory ? "カテゴリの管理" : "タグの管理"}${itemTitle ? `: ${itemTitle}` : ''}`
    : `${itemIds.length}個のアイテムのタグを管理`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <TagInputField itemIds={itemIds} isUserItem={isUserItem} isCategory={isCategory} />
          <CurrentTags itemIds={itemIds} isUserItem={isUserItem} isCategory={isCategory} />
          <ExistingTags itemIds={itemIds} isUserItem={isUserItem} isCategory={isCategory} />
        </div>
      </DialogContent>
    </Dialog>
  );
}