
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProfileHeaderProps {
  username: string;
  onShare: () => void;
  isOwnProfile: boolean;
}

export function ProfileHeader({ username, onShare, isOwnProfile }: ProfileHeaderProps) {
  const isMobile = useIsMobile();

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex-1 flex justify-end">
        {isOwnProfile && <LogoutButton />}
      </div>
      <h1 className="text-2xl font-bold truncate text-center mx-4">
        {username}
      </h1>
      <div className="flex-1 flex justify-start">
        <Button
          variant="outline"
          size="icon"
          onClick={onShare}
          className="h-8 w-8"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
