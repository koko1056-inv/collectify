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
  const isFollowing = useQuery({
    queryKey: ["is-following", userId],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("followed_id", userId)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return !!data;
    },
  });

  const handleFollowToggle = async () => {
    if (!user) return;

    const isCurrentlyFollowing = isFollowing.data;

    if (isCurrentlyFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("followed_id", userId);
    } else {
      await supabase
        .from("follows")
        .insert({
          follower_id: user.id,
          followed_id: userId,
        });
    }

    queryClient.invalidateQueries(["is-following", userId]);
  };

  return (
    <Button
      variant={isFollowing.data ? "outline" : "primary"}
      onClick={handleFollowToggle}
      className={className}
    >
      {isFollowing.data ? "フォロー中" : "フォローする"}
    </Button>
  );
}
