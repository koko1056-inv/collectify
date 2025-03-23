
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TagManageDialogHeaderProps {
  title: string;
}

export function TagManageDialogHeader({ title }: TagManageDialogHeaderProps) {
  return (
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
    </DialogHeader>
  );
}
