import { ItemPriceAndDateForm } from "./ItemPriceAndDateForm";
import { ItemDescriptionField } from "./ItemDescriptionField";

interface ItemDetailsFormProps {
  isEditing: boolean;
  editedData: {
    price: string;
    releaseDate: string;
    description: string;
  };
  setEditedData: (data: any) => void;
  isUserItem?: boolean;
}

export function ItemDetailsForm({ 
  isEditing, 
  editedData, 
  setEditedData,
  isUserItem = false,
}: ItemDetailsFormProps) {
  return (
    <div className="space-y-4">
      <ItemPriceAndDateForm
        isEditing={isEditing}
        editedData={editedData}
        setEditedData={setEditedData}
        isUserItem={isUserItem}
      />

      {!isUserItem && (
        <ItemDescriptionField
          isEditing={isEditing}
          description={editedData.description}
          onChange={(value) => setEditedData({ ...editedData, description: value })}
        />
      )}
    </div>
  );
}