
import { ItemPriceAndDateForm } from "./ItemPriceAndDateForm";
import { ItemDescriptionField } from "./ItemDescriptionField";

interface ItemDetailsFormProps {
  isEditing: boolean;
  editedData: {
    price: string;
    releaseDate: string;
    description: string;
    purchaseDate?: string;
    purchasePrice?: string;
    quantity?: number;
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
  const handleDescriptionChange = (value: string) => {
    setEditedData({
      ...editedData,
      description: value
    });
  };

  const priceAndDateData = isUserItem ? {
    price: editedData.price,
    purchaseDate: editedData.purchaseDate || "",
    purchasePrice: editedData.purchasePrice || "",
    quantity: editedData.quantity || 1
  } : {
    price: editedData.price,
    releaseDate: editedData.releaseDate,
    description: editedData.description,
    quantity: editedData.quantity || 1
  };

  return (
    <div className="space-y-4">
      <ItemPriceAndDateForm
        isEditing={isEditing}
        editedData={priceAndDateData}
        setEditedData={setEditedData}
        isUserItem={isUserItem}
      />

      {!isUserItem && (
        <ItemDescriptionField
          isEditing={isEditing}
          description={editedData.description}
          onChange={handleDescriptionChange}
        />
      )}
    </div>
  );
}
