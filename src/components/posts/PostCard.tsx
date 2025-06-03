
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share, Trash2, MoreHorizontal } from "lucide-react";
import { GoodsPost } from "@/types/posts";
import { useToggleLike, useDeletePost } from "@/hooks/posts";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { DeletePostDialog } from "./DeletePostDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostCardProps {
  post: GoodsPost;
  onCommentClick: () => void;
}

export function PostCard({ post, onCommentClick }: PostCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toggleLike = useToggleLike();
  const deletePost = useDeletePost();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const isLiked = post.post_likes?.some(like => like.user_id === user?.id) || false;
  const likesCount = post.post_likes?.length || 0;
  const isOwner = user?.id === post.user_id;

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

  const handleDeletePost = () => {
    deletePost.mutate(post.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
      }
    });
  };

  return (
    <>
      <Card className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-4xl 2xl:max-w-5xl mx-auto">
        <CardContent className="p-0">
          {/* ヘッダー */}
          <div className="flex items-center p-3 sm:p-4 pb-2">
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
              <AvatarImage src={post.profiles?.avatar_url} />
              <AvatarFallback>
                {post.profiles?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="ml-2 sm:ml-3 flex-1">
              <p className="text-sm sm:text-base font-semibold">{post.profiles?.username}</p>
              <p className="text-xs sm:text-sm text-gray-500">
                {formatDistanceToNow(new Date(post.created_at), { 
                  addSuffix: true, 
                  locale: ja 
                })}
              </p>
            </div>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1 h-auto">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    削除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
          <div className="flex items-center p-3 sm:p-4 pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className="p-0 h-auto"
            >
              <Heart 
                className={`h-5 w-5 sm:h-6 sm:w-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCommentClick}
              className="p-0 h-auto ml-3"
            >
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto ml-3"
            >
              <Share className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </div>

          {/* いいね数 */}
          {likesCount > 0 && (
            <div className="px-3 sm:px-4 pb-2">
              <p className="text-sm sm:text-base font-semibold">{likesCount}件のいいね</p>
            </div>
          )}

          {/* キャプション */}
          {post.caption && (
            <div className="px-3 sm:px-4 pb-2">
              <p className="text-sm sm:text-base">
                <span className="font-semibold">{post.profiles?.username}</span>{" "}
                {post.caption}
              </p>
            </div>
          )}

          {/* グッズ情報 */}
          <div className="px-3 sm:px-4 pb-3 sm:pb-4">
            <button
              onClick={handleItemClick}
              className="flex items-center bg-gray-50 rounded-lg p-2 sm:p-3 w-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <img
                src={post.user_items?.image}
                alt={post.user_items?.title}
                className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded"
              />
              <p className="ml-2 sm:ml-3 text-sm sm:text-base text-gray-700 truncate">
                {post.user_items?.title}
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      <DeletePostDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeletePost}
        isDeleting={deletePost.isPending}
      />
    </>
  );
}
