
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ModalHeaderProps {
  onClose?: React.ReactNode;
}

export function ModalHeader({
  onClose
}: ModalHeaderProps) {
  return (
    <DialogHeader className="px-6 pt-6 pb-0 flex justify-between items-center">
      <DialogTitle className="text-lg">アイテム詳細</DialogTitle>
      {onClose}
    </DialogHeader>
  );
}
