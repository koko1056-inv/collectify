
import { Button } from "@/components/ui/button";
import { Share2, MessageCircle } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { ChatModal } from "@/components/chat/ChatModal";
import { PointsDisplay } from "@/components/ui/points-display";

interface ProfileHeaderProps {
  username: string;
  onShare: () => void;
  isOwnProfile: boolean;
  userId?: string;
}

export function ProfileHeader({ username, onShare, isOwnProfile, userId }: ProfileHeaderProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between w-full">
        <div className="flex-1 flex justify-end">
          <Button
            variant="outline"
            size="icon"
            onClick={onShare}
            className="h-8 w-8"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-col items-center mx-4">
          <h1 className="text-2xl font-bold truncate text-center">
            {username}
          </h1>
          {isOwnProfile && (
            <div className="mt-2">
              <PointsDisplay size="sm" />
            </div>
          )}
        </div>
        <div className="flex-1 flex justify-start gap-2">
          {!isOwnProfile && userId && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsChatOpen(true)}
              className="h-8 w-8"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
          {isOwnProfile && <LogoutButton />}
        </div>
      </div>

      {userId && (
        <ChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          partnerId={userId}
        />
      )}
    </>
  );
}
