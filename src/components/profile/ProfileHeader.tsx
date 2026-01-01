import { Button } from "@/components/ui/button";
import { Share2, MessageCircle } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { ChatModal } from "@/components/chat/ChatModal";
import { PointsDisplay } from "@/components/ui/points-display";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  // 相互フォローかどうかをチェック
  const { data: isMutualFollow } = useQuery({
    queryKey: ["mutual-follow", user?.id, userId],
    queryFn: async () => {
      if (!user?.id || !userId) return false;

      // 自分が相手をフォローしているか
      const { data: following } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", userId)
        .maybeSingle();

      // 相手が自分をフォローしているか
      const { data: followedBy } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", userId)
        .eq("following_id", user.id)
        .maybeSingle();

      return !!following && !!followedBy;
    },
    enabled: !!user?.id && !!userId && user.id !== userId,
  });

  const canChat = isMutualFollow === true;

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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsChatOpen(true)}
                      className="h-8 w-8"
                      disabled={!canChat}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canChat && (
                  <TooltipContent>
                    <p>相互フォローでチャットできます</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
          {isOwnProfile && <LogoutButton />}
        </div>
      </div>

      {userId && canChat && (
        <ChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          partnerId={userId}
        />
      )}
    </>
  );
}
