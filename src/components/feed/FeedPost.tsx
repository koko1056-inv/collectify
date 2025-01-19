import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FeedPostHeader } from "./FeedPostHeader";
import { FeedPostContent } from "./FeedPostContent";
import { FeedPostActions } from "./FeedPostActions";
import { FeedPostModals } from "./FeedPostModals";
import { ItemDetailsModal } from "@/components/ItemDetailsModal";

interface FeedPostProps {
  post: any; // TODO: Add proper type
}

export function FeedPost({ post }: FeedPostProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(
    post.user_item_likes?.some((like: any) => like.user_id === user?.id)
  );
  const [likeCount, setLikeCount] = useState(post.user_item_likes?.length || 0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isMemoriesModalOpen, setIsMemoriesModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "ログインが必要です",
        description: "いいねをするにはログインしてください",
      });
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from("user_item_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("user_item_id", post.id);
        setLikeCount((prev) => prev - 1);
      } else {
        await supabase.from("user_item_likes").insert({
          user_id: user.id,
          user_item_id: post.id,
        });
        setLikeCount((prev) => prev + 1);
      }
      setIsLiked(!isLiked);
    } catch (error) {
      console.error("Error toggling like:", error);
      toast({
        title: "エラー",
        description: "いいねの処理に失敗しました",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <FeedPostHeader
          post={post}
          userId={user?.id}
          onShare={() => setIsShareModalOpen(true)}
          onEdit={() => setIsEditModalOpen(true)}
        />
        <FeedPostContent post={post} />
        <FeedPostActions
          isLiked={isLiked}
          likeCount={likeCount}
          onLike={handleLike}
          onComment={() => setIsMemoriesModalOpen(true)}
          onShare={() => setIsShareModalOpen(true)}
        />
      </div>

      <FeedPostModals
        post={post}
        isShareModalOpen={isShareModalOpen}
        isMemoriesModalOpen={isMemoriesModalOpen}
        onShareClose={() => setIsShareModalOpen(false)}
        onMemoriesClose={() => setIsMemoriesModalOpen(false)}
      />

      {isEditModalOpen && (
        <ItemDetailsModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={post.title}
          image={post.image}
          price={post.prize}
          releaseDate={post.release_date}
          description={post.description}
          itemId={post.id}
          isUserItem={true}
          quantity={post.quantity}
          userId={post.user_id}
          createdBy={post.created_by}
        />
      )}
    </Card>
  );
}