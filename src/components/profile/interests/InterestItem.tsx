
import { X } from "lucide-react";
import { InterestItemProps } from "./types";

export function InterestItem({ interest, onRemove }: InterestItemProps) {
  return (
    <div className="bg-primary/5 text-primary flex items-center gap-1 px-3 py-1.5 rounded-full text-sm">
      {interest}
      <button
        onClick={() => onRemove(interest)}
        className="text-primary/50 hover:text-primary"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
