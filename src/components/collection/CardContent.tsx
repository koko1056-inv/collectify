import { Button } from "@/components/ui/button";
import { LikeButton } from "./LikeButton";
import { TagList } from "./TagList";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Music, Tv } from "lucide-react";

interface CardContentProps {
  itemId: string;
  itemTags: any[];
  memoriesCount: number;
  isOwner: boolean;
  isShared: boolean;
  artist?: string | null;
  anime?: string | null;
  onMemoriesClick: () => void;
  onShareToggle: (checked: boolean) => void;
}

export function CardContent({
  itemId,
  itemTags,
  memoriesCount,
  isOwner,
  isShared,
  artist,
  anime,
  onMemoriesClick,
  onShareToggle,
}: CardContentProps) {
  return (
    <div className="p-4">
      <TagList tags={itemTags} />
      {(artist || anime) && (
        <div className="space-y-1 mt-2 mb-4">
          {artist && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Music className="h-4 w-4" />
              <span>{artist}</span>
            </div>
          )}
          {anime && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Tv className="h-4 w-4" />
              <span>{anime}</span>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center justify-between mt-4">
        {!isOwner && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMemoriesClick}
            className="text-gray-600 hover:text-gray-900"
          >
            思い出を見る ({memoriesCount})
          </Button>
        )}
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