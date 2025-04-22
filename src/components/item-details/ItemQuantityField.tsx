
import { QuantityInput } from "./QuantityInput";

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
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">所有個数</label>
      {isEditing ? (
        <QuantityInput
          value={quantity}
          onChange={onChange}
          min={1}
          max={200}
          className="mt-2"
        />
      ) : (
        <p className="text-sm text-gray-600">
          {quantity}個
        </p>
      )}
    </div>
  );
}
