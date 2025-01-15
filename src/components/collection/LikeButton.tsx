import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Button } from "../ui/button";

interface LikeButtonProps {
  itemId: string;
}

export function LikeButton({ itemId }: LikeButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: likeCount = 0 } = useQuery({
    queryKey: ["item-likes-count", itemId],
    queryFn: async () => {
      const { count } = await supabase
        .from("user_item_likes")
        .select("*", { count: 'exact', head: true })
        .eq("user_item_id", itemId);
      return count || 0;
    },
  });

  const { data: isLiked = false } = useQuery({
    queryKey: ["item-is-liked", itemId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_item_likes")
        .select("id")
        .eq("user_item_id", itemId)
        .eq("user_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "ログインが必要です",
        description: "いいねをするにはログインしてください。",
      });
      return;
    }

    try {
      if (isLiked) {
        const { error } = await supabase
          .from("user_item_likes")
          .delete()
          .eq("user_item_id", itemId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_item_likes")
          .insert({
            user_item_id: itemId,
            user_id: user.id,
          });

        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["item-likes-count", itemId] });
      queryClient.invalidateQueries({ queryKey: ["item-is-liked", itemId, user.id] });
      queryClient.invalidateQueries({ queryKey: ["user-items", user.id] });

      toast({
        title: isLiked ? "いいねを取り消しました" : "いいねしました",
        description: isLiked ? "コレクションのいいねを取り消しました。" : "コレクションにいいねしました。",
      });
    } catch (error) {
      console.error("Error toggling like:", error);
      toast({
        title: "エラー",
        description: "いいねの更新に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLikeToggle}
        className={`h-7 w-7 sm:h-9 sm:w-9 p-1.5 ${
          isLiked ? "text-red-500 hover:text-red-600" : "text-gray-500 hover:text-gray-600"
        }`}
      >
        <Heart className={`h-full w-full ${isLiked ? "fill-current" : ""}`} />
      </Button>
      <span className="text-[10px] sm:text-xs text-gray-500 -mt-1">{likeCount}</span>
    </div>
  );
}