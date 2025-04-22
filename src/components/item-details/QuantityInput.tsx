
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Minus, Plus } from "lucide-react";

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function QuantityInput({ 
  value, 
  onChange, 
  min = 1, 
  max = 999, 
  className = "" 
}: QuantityInputProps) {
  const handleDecrease = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrease = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = parseInt(e.target.value) || min;
    const newValue = Math.max(min, Math.min(max, inputValue));
    onChange(newValue);
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Button 
        type="button"
        variant="outline" 
        size="icon" 
        onClick={handleDecrease}
        className="h-8 w-8"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={handleInputChange}
        className="w-20 text-center"
      />
      <Button 
        type="button"
        variant="outline" 
        size="icon" 
        onClick={handleIncrease}
        className="h-8 w-8"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
