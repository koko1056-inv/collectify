import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface FeedPostProps {
  post: {
    id: string;
    title: string;
    image: string;
    created_at: string;
    user_id: string;
    profiles: {
      username: string;
      avatar_url: string | null;
    };
    user_item_likes: Array<{
      user_id: string;
    }>;
  };
}

export function FeedPost({ post }: FeedPostProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(
    post.user_item_likes.some((like) => like.user_id === user?.id)
  );
  const [likeCount, setLikeCount] = useState(post.user_item_likes.length);

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "ログインが必要です",
        description: "いいねをするにはログインしてください",
      });
      return;
    }

    if (isLiked) {
      const { error } = await supabase
        .from("user_item_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("user_item_id", post.id);

      if (!error) {
        setIsLiked(false);
        setLikeCount((prev) => prev - 1);
      }
    } else {
      const { error } = await supabase
        .from("user_item_likes")
        .insert([{ user_id: user.id, user_item_id: post.id }]);

      if (!error) {
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-center space-x-3">
          <Link to={`/user/${post.user_id}`}>
            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
              {post.profiles.avatar_url ? (
                <img
                  src={post.profiles.avatar_url}
                  alt={post.profiles.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200" />
              )}
            </div>
          </Link>
          <div>
            <Link
              to={`/user/${post.user_id}`}
              className="font-medium text-gray-900 hover:underline"
            >
              {post.profiles.username}
            </Link>
            <p className="text-sm text-gray-500">
              {new Date(post.created_at).toLocaleDateString("ja-JP")}
            </p>
          </div>
        </div>
      </div>

      <div className="aspect-square bg-gray-100">
        <img
          src={post.image}
          alt={post.title}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLike}
            className={isLiked ? "text-red-500" : ""}
          >
            <Heart className="h-5 w-5" fill={isLiked ? "currentColor" : "none"} />
          </Button>
          <Button variant="ghost" size="icon">
            <MessageCircle className="h-5 w-5" />
          </Button>
        </div>
        <p className="mt-1 text-sm font-medium">{likeCount}件のいいね</p>
        <p className="mt-2">{post.title}</p>
      </div>
    </Card>
  );
}