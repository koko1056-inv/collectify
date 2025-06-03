
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share } from "lucide-react";
import { GoodsPost } from "@/types/posts";
import { useToggleLike } from "@/hooks/posts";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface PostCardProps {
  post: GoodsPost;
  onCommentClick: () => void;
}

export function PostCard({ post, onCommentClick }: PostCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toggleLike = useToggleLike();
  
  const isLiked = post.post_likes?.some(like => like.user_id === user?.id) || false;
  const likesCount = post.post_likes?.length || 0;

  const handleLike = () => {
    if (!user) return;
    toggleLike.mutate({ postId: post.id, isLiked });
  };

  const handleItemClick = () => {
    // user_itemsからofficial_item_idを取得して探すページに遷移
    const officialItemId = post.user_items?.official_item_id;
    if (officialItemId) {
      navigate(`/search?item=${officialItemId}`);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-0">
        {/* ヘッダー */}
        <div className="flex items-center p-4 pb-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={post.profiles?.avatar_url} />
            <AvatarFallback>
              {post.profiles?.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="ml-2 flex-1">
            <p className="text-sm font-semibold">{post.profiles?.username}</p>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(post.created_at), { 
                addSuffix: true, 
                locale: ja 
              })}
            </p>
          </div>
        </div>

        {/* 投稿画像 */}
        <div className="aspect-square">
          <img
            src={post.image_url}
            alt="投稿画像"
            className="w-full h-full object-cover"
          />
        </div>

        {/* アクションボタン */}
        <div className="flex items-center p-4 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className="p-0 h-auto"
          >
            <Heart 
              className={`h-6 w-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCommentClick}
            className="p-0 h-auto ml-3"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-auto ml-3"
          >
            <Share className="h-6 w-6" />
          </Button>
        </div>

        {/* いいね数 */}
        {likesCount > 0 && (
          <div className="px-4 pb-2">
            <p className="text-sm font-semibold">{likesCount}件のいいね</p>
          </div>
        )}

        {/* キャプション */}
        {post.caption && (
          <div className="px-4 pb-2">
            <p className="text-sm">
              <span className="font-semibold">{post.profiles?.username}</span>{" "}
              {post.caption}
            </p>
          </div>
        )}

        {/* グッズ情報 */}
        <div className="px-4 pb-4">
          <button
            onClick={handleItemClick}
            className="flex items-center bg-gray-50 rounded-lg p-2 w-full hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <img
              src={post.user_items?.image}
              alt={post.user_items?.title}
              className="w-10 h-10 object-cover rounded"
            />
            <p className="ml-2 text-sm text-gray-700">
              {post.user_items?.title}
            </p>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
