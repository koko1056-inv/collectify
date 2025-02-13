
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "react-router-dom";

interface ProfileHeaderProps {
  username: string;
  onShare: () => void;
  isOwnProfile: boolean;
}

export function ProfileHeader({ username, onShare, isOwnProfile }: ProfileHeaderProps) {
  const isMobile = useIsMobile();

  return (
    <div className="flex items-center justify-center gap-4 w-full">
      <h1 className="text-2xl font-bold truncate text-center">{username}</h1>
      <div className="flex items-center gap-2">
        {isOwnProfile && (
          <Link 
            to="/edit-profile"
            className="text-center py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 text-sm"
          >
            プロフィールを編集
          </Link>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={onShare}
          className="h-8 w-8 shrink-0"
        >
          <Share2 className="h-4 w-4" />
        </Button>
        {isOwnProfile && <LogoutButton />}
      </div>
    </div>
  );
}
