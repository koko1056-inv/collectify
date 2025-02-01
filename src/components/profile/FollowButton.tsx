import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface FollowButtonProps {
  userId: string;
}

export function FollowButton({ userId }: FollowButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
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

        toast({
          title: "フォロー解除",
          description: "フォローを解除しました",
        });
      } else {
        await supabase.from("follows").insert({
          follower_id: user.id,
          following_id: userId,
        });

        toast({
          title: "フォロー完了",
          description: "フォローしました",
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
        title: "エラー",
        description: "操作に失敗しました",
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
      className="gap-2"
    >
      {isFollowing ? (
        <>
          <UserMinus className="h-4 w-4" />
          フォロー解除
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          フォロー
        </>
      )}
    </Button>
  );
}