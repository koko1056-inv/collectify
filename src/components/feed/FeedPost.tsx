import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heart, MessageSquare, Share2, MoreVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ShareModal } from "@/components/ShareModal";
import { ItemMemoriesModal } from "@/components/ItemMemoriesModal";

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

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const handleReport = () => {
    toast({
      title: "報告完了",
      description: "投稿を報告しました。ご協力ありがとうございます。",
    });
  };

  const handleHide = () => {
    toast({
      title: "非表示にしました",
      description: "この投稿は今後表示されません",
    });
  };

  const handleComment = () => {
    setIsMemoriesModalOpen(true);
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link to={`/user/${post.user_id}`}>
              <Avatar>
                <AvatarImage src={post.profiles?.avatar_url} />
                <AvatarFallback>
                  {post.profiles?.display_name?.[0] ||
                    post.profiles?.username?.[0]}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <Link
                to={`/user/${post.user_id}`}
                className="font-medium hover:underline"
              >
                {post.profiles?.display_name || post.profiles?.username}
              </Link>
              <p className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                  locale: ja,
                })}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">メニューを開く</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user?.id === post.user_id ? (
                <>
                  <DropdownMenuItem>編集</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    削除
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={handleReport}>報告</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleHide}>非表示にする</DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={handleShare}>共有</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4">
          <img
            src={post.image}
            alt={post.title}
            className="rounded-lg w-full object-cover aspect-square"
          />
        </div>

        <div className="mt-4">
          <h3 className="font-medium">{post.title}</h3>
          <p className="mt-1 text-gray-600">{post.description}</p>
        </div>

        {post.user_item_tags?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.user_item_tags.map(
              (tag: any) =>
                tag.tags && (
                  <Badge key={tag.tags.id} variant="secondary">
                    {tag.tags.name}
                  </Badge>
                )
            )}
          </div>
        )}

        <div className="mt-4 flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="space-x-2"
            onClick={handleLike}
          >
            <Heart
              className={`h-4 w-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`}
            />
            <span>{likeCount}</span>
          </Button>
          <Button variant="ghost" size="sm" className="space-x-2" onClick={handleComment}>
            <MessageSquare className="h-4 w-4" />
            <span>コメント</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={post.title}
        url={window.location.href}
        image={post.image}
      />

      <ItemMemoriesModal
        isOpen={isMemoriesModalOpen}
        onClose={() => setIsMemoriesModalOpen(false)}
        itemIds={[post.id]}
        itemTitles={[post.title]}
        userId={post.user_id}
      />
    </Card>
  );
}