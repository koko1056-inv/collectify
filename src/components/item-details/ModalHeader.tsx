
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ModalHeaderProps {
  onClose?: React.ReactNode | (() => void);
}

export function ModalHeader({
  onClose
}: ModalHeaderProps) {
  return (
    <DialogHeader className="px-6 pt-6 pb-0 flex justify-between items-center">
      <DialogTitle className="text-lg">アイテム詳細</DialogTitle>
      {typeof onClose === 'function' ? (
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      ) : (
        onClose
      )}
    </DialogHeader>
  );
}
