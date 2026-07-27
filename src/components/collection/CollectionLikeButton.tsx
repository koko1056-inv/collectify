import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Button } from "../ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface CollectionLikeButtonProps {
  collectionOwnerId: string;
}

export function CollectionLikeButton({ collectionOwnerId }: CollectionLikeButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

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
      toast(t("collectionScreen.like.loginRequired"), {
        description: t("collectionScreen.like.loginRequiredDesc"),
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

      toast.success(isLiked ? t("collectionScreen.like.unliked") : t("collectionScreen.like.liked"), {
        description: isLiked ? t("collectionScreen.like.unlikedDesc") : t("collectionScreen.like.likedDesc"),
      });
    } catch (error) {
      console.error("Error toggling collection like:", error);
      toast.error(t("collectionScreen.common.error"), {
        description: t("collectionScreen.like.failed"),
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
          isLiked ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
      </Button>
      <span className="text-sm text-muted-foreground">{likeCount}</span>
    </div>
  );
}