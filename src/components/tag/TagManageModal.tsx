import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TagInputField } from "./TagInputField";
import { CurrentTags } from "./CurrentTags";
import { ExistingTags } from "./ExistingTags";

interface TagManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
}

export function TagManageModal({
  isOpen,
  onClose,
  itemId,
  itemTitle,
}: TagManageModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>タグの管理 - {itemTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <TagInputField itemId={itemId} />
          <CurrentTags itemId={itemId} />
          <ExistingTags itemId={itemId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}