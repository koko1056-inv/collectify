import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface QuantityInputProps {
  isEditing: boolean;
  quantity: number;
  onChange: (value: number) => void;
}

export function QuantityInput({ isEditing, quantity, onChange }: QuantityInputProps) {
  if (!isEditing) {
    return (
      <div>
        <span className="font-semibold">数量：</span>
        <span>{quantity}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">数量</Label>
      <Input
        type="number"
        min="1"
        value={quantity}
        onChange={(e) => onChange(parseInt(e.target.value) || 1)}
      />
    </div>
  );
}