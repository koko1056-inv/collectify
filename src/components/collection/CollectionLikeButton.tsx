import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { useState } from "react";

interface CollectionLikeButtonProps {
  collectionOwnerId: string;
  className?: string;
}

export function CollectionLikeButton({ collectionOwnerId, className }: CollectionLikeButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(false);

  const { data: likeData } = useQuery({
    queryKey: ["collection-likes", collectionOwnerId, user?.id],
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

  const handleLikeToggle = async () => {
    if (!user) return;

    try {
      if (likeData) {
        await supabase
          .from("collection_likes")
          .delete()
          .eq("collection_owner_id", collectionOwnerId)
          .eq("user_id", user.id);
        setIsLiked(false);
      } else {
        await supabase
          .from("collection_likes")
          .insert({
            collection_owner_id: collectionOwnerId,
            user_id: user.id,
          });
        setIsLiked(true);
      }
      await queryClient.invalidateQueries({
        queryKey: ["collection-likes", collectionOwnerId],
      });
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  return (
    <Button
      variant="outline"
      className={className}
      onClick={handleLikeToggle}
      aria-label={isLiked ? "Unlike" : "Like"}
    >
      <Heart className={`h-5 w-5 ${isLiked ? "text-red-500" : "text-gray-500"}`} />
    </Button>
  );
}