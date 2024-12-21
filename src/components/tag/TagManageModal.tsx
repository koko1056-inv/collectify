import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TagInputField } from "./TagInputField";
import { ExistingTags } from "./ExistingTags";
import { CurrentTags } from "./CurrentTags";

interface TagManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
  isUserItem?: boolean;
  isCategory?: boolean;
}

export function TagManageModal({ 
  isOpen, 
  onClose, 
  itemId, 
  itemTitle, 
  isUserItem = false,
  isCategory = false 
}: TagManageModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isCategory ? "アーティスト/アニメの管理" : "タグの管理"}: {itemTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <TagInputField itemId={itemId} isUserItem={isUserItem} isCategory={isCategory} />
          <CurrentTags itemId={itemId} isUserItem={isUserItem} isCategory={isCategory} />
          <ExistingTags itemId={itemId} isUserItem={isUserItem} isCategory={isCategory} />
        </div>
      </DialogContent>
    </Dialog>
  );
}