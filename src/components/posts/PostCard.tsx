
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
      <div className="w-full px-2 sm:px-3 md:px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-start gap-2 sm:gap-3 mb-3">
          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
            <AvatarImage src={post.profiles?.avatar_url} />
            <AvatarFallback>
              {post.profiles?.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold hover:underline cursor-pointer">
                {post.profiles?.username}
              </p>
              <span className="text-muted-foreground">·</span>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { 
                  addSuffix: true, 
                  locale: ja 
                })}
              </p>
              
              {isOwner && (
                <div className="ml-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {/* キャプション */}
            {post.caption && (
              <p className="text-sm mb-3 leading-5">
                {post.caption}
              </p>
            )}

            {/* 投稿画像 */}
            <div className="rounded-2xl overflow-hidden border border-border mb-3 max-w-full">
              <img
                src={post.image_url}
                alt="投稿画像"
                className="w-full max-h-80 sm:max-h-96 object-cover"
              />
            </div>

            {/* グッズ情報カード */}
            <div className="mb-3">
              <button
                onClick={handleItemClick}
                className="flex items-center gap-3 p-3 border border-border rounded-2xl w-full hover:bg-muted/50 transition-colors"
              >
                <img
                  src={post.user_items?.image}
                  alt={post.user_items?.title}
                  className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg flex-shrink-0"
                />
                <div className="text-left flex-1 min-w-0 overflow-hidden">
                  <p className="font-medium text-sm truncate">
                    {post.user_items?.title}
                  </p>
                  {post.user_items?.content_name && (
                    <p className="text-xs text-muted-foreground truncate">
                      {post.user_items.content_name}
                    </p>
                  )}
                </div>
              </button>
            </div>

            {/* アクションボタン */}
            <div className="flex items-center justify-between max-w-md">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCommentClick}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary h-9"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm">コメント</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`flex items-center gap-2 h-9 ${
                  isLiked 
                    ? 'text-red-500 hover:text-red-600' 
                    : 'text-muted-foreground hover:text-red-500'
                }`}
              >
                <Heart 
                  className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`}
                />
                {likesCount > 0 && (
                  <span className="text-sm">{likesCount}</span>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary h-9"
              >
                <Share className="h-5 w-5" />
                <span className="text-sm">シェア</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <DeletePostDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeletePost}
        isDeleting={deletePost.isPending}
      />
    </>
  );
}
