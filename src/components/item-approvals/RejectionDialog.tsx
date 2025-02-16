
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface RejectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  onReject: () => void;
  isRejecting: boolean;
}

export function RejectionDialog({
  isOpen,
  onClose,
  reason,
  onReasonChange,
  onReject,
  isRejecting,
}: RejectionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>アイテムの却下理由</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="却下理由を入力してください"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={!reason.trim() || isRejecting}
          >
            却下する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
