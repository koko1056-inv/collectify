import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ItemDetailsHeaderProps {
  isEditing: boolean;
  title: string;
  editedData: {
    title: string;
  };
  setEditedData: (data: any) => void;
}

export function ItemDetailsHeader({
  isEditing,
  title,
  editedData,
  setEditedData,
}: ItemDetailsHeaderProps) {
  return (
    <DialogHeader>
      {isEditing ? (
        <Input
          value={editedData.title}
          onChange={(e) =>
            setEditedData({ ...editedData, title: e.target.value })
          }
          className="text-xl font-bold"
          placeholder="タイトルを入力"
          required
        />
      ) : (
        <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
      )}
    </DialogHeader>
  );
}