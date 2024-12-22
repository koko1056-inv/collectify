import { Button } from "@/components/ui/button";
import { Camera, Share2 } from "lucide-react";

interface ProfileHeaderProps {
  username: string;
  onScreenshot: () => void;
  onShare: () => void;
}

export function ProfileHeader({ username, onScreenshot, onShare }: ProfileHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">{username}のプロフィール</h1>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onScreenshot}
          className="gap-2"
        >
          <Camera className="h-4 w-4" />
          スクショ
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onShare}
          className="gap-2"
        >
          <Share2 className="h-4 w-4" />
          共有
        </Button>
      </div>
    </div>
  );
}