import { Button } from "@/components/ui/button";
import { LikeButton } from "./LikeButton";
import { TagList } from "./TagList";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface CardContentProps {
  itemId: string;
  itemTags: any[];
  memoriesCount: number;
  isOwner: boolean;
  isShared: boolean;
  onMemoriesClick: () => void;
  onShareToggle: (checked: boolean) => void;
}

export function CardContent({
  itemId,
  itemTags,
  memoriesCount,
  isOwner,
  isShared,
  onMemoriesClick,
  onShareToggle,
}: CardContentProps) {
  return (
    <div className="p-4">
      <TagList tags={itemTags} />
      <div className="flex items-center justify-between mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMemoriesClick}
          className="text-gray-600 hover:text-gray-900"
        >
          思い出を見る ({memoriesCount})
        </Button>
        <LikeButton itemId={itemId} />
      </div>
      {isOwner && (
        <div className="flex items-center justify-between mt-4 space-x-2">
          <Label htmlFor={`share-toggle-${itemId}`} className="text-sm text-gray-600">
            {isShared ? "共有中" : "非公開"}
          </Label>
          <Switch
            id={`share-toggle-${itemId}`}
            checked={isShared}
            onCheckedChange={onShareToggle}
          />
        </div>
      )}
    </div>
  );
}