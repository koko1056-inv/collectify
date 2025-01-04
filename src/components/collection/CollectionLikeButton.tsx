import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Button } from "../ui/button";

interface CollectionLikeButtonProps {
  collectionOwnerId: string;
}

export function CollectionLikeButton({ collectionOwnerId }: CollectionLikeButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: likeCount = 0 } = useQuery({
    queryKey: ["collection-likes-count", collectionOwnerId],
    queryFn: async () => {
      const { count } = await supabase
        .from("collection_likes")
        .select("*", { count: 'exact', head: true })
        .eq("collection_owner_id", collectionOwnerId);
      return count || 0;
    },
  });

  const { data: isLiked = false } = useQuery({
    queryKey: ["collection-is-liked", collectionOwnerId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("collection_likes")
        .select("id")
        .eq("collection_owner_id", collectionOwnerId)
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
          .from("collection_likes")
          .delete()
          .eq("collection_owner_id", collectionOwnerId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("collection_likes")
          .insert({
            collection_owner_id: collectionOwnerId,
            user_id: user.id,
          });

        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["collection-likes-count", collectionOwnerId] });
      queryClient.invalidateQueries({ queryKey: ["collection-is-liked", collectionOwnerId, user.id] });

      toast({
        title: isLiked ? "いいねを取り消しました" : "いいねしました",
        description: isLiked ? "コレクションのいいねを取り消しました。" : "コレクションにいいねしました。",
      });
    } catch (error) {
      console.error("Error toggling collection like:", error);
      toast({
        title: "エラー",
        description: "いいねの更新に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLikeToggle}
        className={`${
          isLiked ? "text-red-500 hover:text-red-600" : "text-gray-500 hover:text-gray-600"
        }`}
      >
        <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
      </Button>
      <span className="text-sm text-gray-500">{likeCount}</span>
    </div>
  );
}