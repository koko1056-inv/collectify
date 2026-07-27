
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";

interface FollowButtonProps {
  userId: string;
}

export function FollowButton({ userId }: FollowButtonProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: isFollowing } = useQuery({
    queryKey: ["following", user?.id, userId],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("follows")
        .select()
        .eq("follower_id", user.id)
        .eq("following_id", userId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && user.id !== userId,
  });

  const handleFollow = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", userId);

        toast.success(t("profileScreen.follow.unfollowedTitle"), {
          description: t("profileScreen.follow.unfollowedDesc"),
        });
      } else {
        await supabase.from("follows").insert({
          follower_id: user.id,
          following_id: userId,
        });

        toast.success(t("profileScreen.follow.followedTitle"), {
          description: t("profileScreen.follow.followedDesc"),
        });
      }

      queryClient.invalidateQueries({
        queryKey: ["following", user.id, userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["profile", userId],
      });
    } catch (error) {
      toast.error(t("profileScreen.common.error"), {
        description: t("profileScreen.follow.actionFailed"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.id === userId) return null;

  return (
    <Button
      variant={isFollowing ? "destructive" : "default"}
      size="sm"
      onClick={handleFollow}
      disabled={isLoading}
      className="w-full gap-2"
    >
      {isFollowing ? (
        <>
          <UserMinus className="h-4 w-4" />
          {t("profileScreen.follow.unfollow")}
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          {t("profileScreen.follow.follow")}
        </>
      )}
    </Button>
  );
}
