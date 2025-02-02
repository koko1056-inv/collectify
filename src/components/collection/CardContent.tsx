import { CardContent as UICardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { TagList } from "./TagList";
import { LikeButton } from "./LikeButton";
import { BookMarked } from "lucide-react";

interface CardContentProps {
  itemId: string;
  itemTags: any[];
  memoriesCount: number;
  isOwner: boolean;
  onMemoriesClick: () => void;
  onShareToggle: (checked: boolean) => void;
}

export function CardContent({
  itemId,
  itemTags,
  memoriesCount,
  isOwner,
  onMemoriesClick,
  onShareToggle,
}: CardContentProps) {
  return (
    <UICardContent className="px-3 py-2 space-y-1">
      <div className="flex items-center justify-between">
        <TagList tags={itemTags} />
        {isOwner && (
          <Switch
            onCheckedChange={onShareToggle}
            className="scale-75 origin-right"
          />
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <LikeButton itemId={itemId} />
        {memoriesCount > 0 && (
          <button
            onClick={onMemoriesClick}
            className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-600 transition-colors"
          >
            <BookMarked className="h-3.5 w-3.5" />
            <span>{memoriesCount}</span>
          </button>
        )}
      </div>
    </UICardContent>
  );
}