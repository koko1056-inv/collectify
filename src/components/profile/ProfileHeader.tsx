
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
    <div className="flex items-center justify-center w-full">
      <h1 className="text-2xl font-bold truncate text-center">{username}</h1>
      <div className={`flex items-center space-x-2 shrink-0 ${isMobile ? 'mr-2' : ''}`}>
        {isOwnProfile && <LogoutButton />}
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
