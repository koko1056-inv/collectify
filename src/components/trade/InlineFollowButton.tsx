import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface InlineFollowButtonProps {
  userId: string;
  size?: "sm" | "icon";
}

export function InlineFollowButton({ userId, size = "sm" }: InlineFollowButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: isFollowing } = useQuery({
    queryKey: ["following", user?.id, userId],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", userId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && user.id !== userId,
  });

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    setIsLoading(true);

    try {
      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", userId);

        toast({
          title: t("trade.follow.unfollowedTitle"),
          description: t("trade.follow.unfollowedDesc"),
        });
      } else {
        await supabase.from("follows").insert({
          follower_id: user.id,
          following_id: userId,
        });

        toast({
          title: t("trade.follow.followedTitle"),
          description: t("trade.follow.followedDesc"),
        });
      }

      queryClient.invalidateQueries({
        queryKey: ["following", user.id, userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["profile", userId],
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("trade.follow.errorDesc"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.id === userId) return null;

  if (size === "icon") {
    return (
      <Button
        variant={isFollowing ? "secondary" : "default"}
        size="icon"
        onClick={handleFollow}
        disabled={isLoading}
        className="h-8 w-8 shrink-0"
      >
        {isFollowing ? (
          <UserCheck className="h-4 w-4" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing ? "secondary" : "default"}
      size="sm"
      onClick={handleFollow}
      disabled={isLoading}
      className="gap-1"
    >
      {isFollowing ? (
        <>
          <UserCheck className="h-3 w-3" />
          {t("trade.follow.following")}
        </>
      ) : (
        <>
          <UserPlus className="h-3 w-3" />
          {t("trade.follow.follow")}
        </>
      )}
    </Button>
  );
}
