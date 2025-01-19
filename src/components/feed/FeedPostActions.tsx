import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Share2 } from "lucide-react";

interface FeedPostActionsProps {
  isLiked: boolean;
  likeCount: number;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
}

export function FeedPostActions({
  isLiked,
  likeCount,
  onLike,
  onComment,
  onShare,
}: FeedPostActionsProps) {
  return (
    <div className="mt-4 flex items-center space-x-4">
      <Button variant="ghost" size="sm" className="space-x-2" onClick={onLike}>
        <Heart className={`h-4 w-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
        <span>{likeCount}</span>
      </Button>
      <Button variant="ghost" size="sm" className="space-x-2" onClick={onComment}>
        <MessageSquare className="h-4 w-4" />
        <span>コメント</span>
      </Button>
      <Button variant="ghost" size="sm" onClick={onShare}>
        <Share2 className="h-4 w-4" />
      </Button>
    </div>
  );
}