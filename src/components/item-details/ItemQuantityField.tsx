
import { useState } from "react";
import { QuantityInput } from "./QuantityInput";
import { Label } from "@/components/ui/label";

interface ItemQuantityFieldProps {
  isEditing: boolean;
  quantity: number;
  onChange: (value: number) => void;
}

export function ItemQuantityField({
  isEditing,
  quantity,
  onChange,
}: ItemQuantityFieldProps) {
  const [localQuantity, setLocalQuantity] = useState(quantity);

  const handleQuantityChange = (value: number) => {
    setLocalQuantity(value);
    onChange(value);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">所有個数</Label>
      {isEditing ? (
        <QuantityInput
          value={localQuantity}
          onChange={handleQuantityChange}
          min={1}
          max={200}
          className="mt-2"
        />
      ) : (
        <p className="text-sm text-gray-600 mt-1">
          {quantity}個
        </p>
      )}
    </div>
  );
}
