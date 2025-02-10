
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
      <h1 className="text-2xl font-bold truncate mr-2">{username}</h1>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onShare}
          className="gap-1"
        >
          <Share2 className="h-3 w-3" />
          共有
        </Button>
        {isOwnProfile && <LogoutButton />}
      </div>
    </div>
  );
}
