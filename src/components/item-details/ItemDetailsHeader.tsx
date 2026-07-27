import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  return (
    <DialogHeader>
      {isEditing ? (
        <Input
          value={editedData.title}
          onChange={(e) =>
            setEditedData({ ...editedData, title: e.target.value })
          }
          className="text-xl font-bold"
          placeholder={t("itemDetails.fields.titlePlaceholder")}
          required
        />
      ) : (
        <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
      )}
    </DialogHeader>
  );
}