import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

interface ProfileHeaderProps {
  username: string;
  onShare: () => void;
}

export function ProfileHeader({ username, onShare }: ProfileHeaderProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <h1 className="text-2xl font-bold">{username}</h1>
      <Button
        variant="outline"
        size="sm"
        onClick={onShare}
        className="gap-2 ml-auto"
      >
        <Share2 className="h-4 w-4" />
        共有
      </Button>
    </div>
  );
}