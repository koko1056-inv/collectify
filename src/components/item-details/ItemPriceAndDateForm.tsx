import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";

interface ItemPriceAndDateFormProps {
  isEditing: boolean;
  editedData: {
    price: string;
    releaseDate: string;
  };
  setEditedData: (data: any) => void;
  isUserItem?: boolean;
}

export function ItemPriceAndDateForm({ 
  isEditing, 
  editedData, 
  setEditedData,
  isUserItem = false,
}: ItemPriceAndDateFormProps) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">{t("itemDetails.fields.registeredDate")}</label>
        {isEditing ? (
          <Input
            type="date"
            value={editedData.releaseDate}
            onChange={(e) =>
              setEditedData({ ...editedData, releaseDate: e.target.value })
            }
          />
        ) : (
          <p className="text-sm text-gray-600">
            {editedData.releaseDate || t("itemDetails.common.notSet")}
          </p>
        )}
      </div>
    </div>
  );
}