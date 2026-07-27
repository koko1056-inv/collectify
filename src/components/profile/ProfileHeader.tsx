import { Button } from "@/components/ui/button";
import { Share2, MessageCircle } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { ChatModal } from "@/components/chat/ChatModal";
import { PointsDisplay } from "@/components/ui/points-display";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfileHeaderProps {
  username: string;
  onShare: () => void;
  isOwnProfile: boolean;
  userId?: string;
}

export function ProfileHeader({ username, onShare, isOwnProfile, userId }: ProfileHeaderProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center w-full gap-3">
        {/* ユーザー名とポイント */}
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-bold truncate text-center">
            {username}
          </h1>
          {isOwnProfile && (
            <div className="mt-2">
              <PointsDisplay size="sm" />
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onShare}
            className="gap-1.5 text-xs"
          >
            <Share2 className="h-3.5 w-3.5" />
            {t("profileScreen.header.share")}
          </Button>

          {!isOwnProfile && userId && user && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsChatOpen(true)}
              className="gap-1.5 text-xs"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {t("profileScreen.header.message")}
            </Button>
          )}

          {isOwnProfile && <LogoutButton />}
        </div>
      </div>

      {userId && user && (
        <ChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          partnerId={userId}
        />
      )}
    </>
  );
}
