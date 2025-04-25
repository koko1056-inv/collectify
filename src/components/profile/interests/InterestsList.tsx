
import { InterestItem } from "./InterestItem";
import { InterestsListProps } from "./types";

export function InterestsList({ interests, onRemove }: InterestsListProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {interests.map((interest) => (
        <InterestItem
          key={interest}
          interest={interest}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
