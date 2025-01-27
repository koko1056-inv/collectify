import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface FollowButtonProps {
  userId: string;
  className?: string;
}

export function FollowButton({ userId, className }: FollowButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isFollowing } = useQuery({
    queryKey: ["is-following", userId],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", userId)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return !!data;
    },
    enabled: !!user,
  });

  const handleFollowToggle = async () => {
    if (!user) return;

    try {
      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", userId);
      } else {
        await supabase
          .from("follows")
          .insert({
            follower_id: user.id,
            following_id: userId,
          });
      }

      await queryClient.invalidateQueries({
        queryKey: ["is-following", userId],
      });
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      onClick={handleFollowToggle}
      className={className}
    >
      {isFollowing ? "フォロー中" : "フォローする"}
    </Button>
  );
}