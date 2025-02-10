
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileHeaderProps {
  username: string;
  onShare: () => void;
  isOwnProfile: boolean;
}

export function ProfileHeader({ username, onShare, isOwnProfile }: ProfileHeaderProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <h1 className="text-2xl font-bold">{username}</h1>
      <div className="flex gap-2 ml-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onShare}
          className="gap-2"
        >
          <Share2 className="h-4 w-4" />
          共有
        </Button>
        {isOwnProfile && <LogoutButton />}
      </div>
    </div>
  );
}
