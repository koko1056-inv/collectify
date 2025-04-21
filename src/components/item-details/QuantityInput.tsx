
import { Input } from "../ui/input";

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function QuantityInput({ value, onChange, min = 1, max = 999, className = "" }: QuantityInputProps) {
  return (
    <Input
      type="number"
      min={min}
      max={max}
      value={value}
      className={className}
      onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
    />
  );
}
