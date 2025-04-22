
import { Input } from "../ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

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
  const incrementQuantity = () => {
    onChange(Math.min(999, quantity + 1));
  };

  const decrementQuantity = () => {
    onChange(Math.max(1, quantity - 1));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    onChange(Math.max(1, Math.min(999, value)));
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">所有個数</Label>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={decrementQuantity}
            className="h-9 w-9"
            disabled={quantity <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          
          <Input
            type="number"
            value={quantity}
            onChange={handleInputChange}
            min={1}
            max={999}
            className="w-20 text-center"
          />
          
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={incrementQuantity}
            className="h-9 w-9"
            disabled={quantity >= 999}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <p className="text-sm text-gray-600 mt-1">
          {quantity}個
        </p>
      )}
    </div>
  );
}
