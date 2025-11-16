
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share, Trash2, MoreHorizontal, Copy, Check } from "lucide-react";
import { GoodsPost } from "@/types/posts";
import { useToggleLike, useDeletePost } from "@/hooks/posts";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { DeletePostDialog } from "./DeletePostDialog";
import { toast } from "sonner";
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
  const [isCopied, setIsCopied] = useState(false);
  
  const isLiked = post.post_likes?.some(like => like.user_id === user?.id) || false;
  const likesCount = post.post_likes?.length || 0;
  const commentsCount = post.post_comments?.length || 0;
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

  const handleShare = async () => {
    const shareData = {
      title: `${post.profiles?.username}さんの投稿`,
      text: post.caption || `${post.user_items?.title}の投稿`,
      url: window.location.href
    };

    try {
      // Web Share API が利用可能で、かつHTTPS環境の場合のみ使用
      if (navigator.share && window.location.protocol === 'https:') {
        await navigator.share(shareData);
        return;
      }
    } catch (error) {
      console.log("Web Share API failed, falling back to clipboard:", error);
    }

    // フォールバック: クリップボードにコピー
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      toast.success("リンクをクリップボードにコピーしました");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (clipboardError) {
      console.error("クリップボードのコピーに失敗しました:", clipboardError);
      // 最後のフォールバック: テキスト選択
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success("リンクをクリップボードにコピーしました");
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (fallbackError) {
        toast.error("シェア機能をご利用いただけません");
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  return (
    <>
      <div className="w-full px-3 py-3 hover:bg-muted/50 transition-colors border-b border-border">
        {/* ヘッダー */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={post.profiles?.avatar_url} />
            <AvatarFallback>
              {post.profiles?.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold hover:underline cursor-pointer text-sm">
                {post.profiles?.username}
              </p>
              <span className="text-muted-foreground">·</span>
              <p className="text-xs text-muted-foreground">
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
              <p className="text-sm mb-3 leading-5 break-words">
                {post.caption}
              </p>
            )}
          </div>
        </div>

        {/* 投稿画像 */}
        <div className="rounded-2xl overflow-hidden border border-border mb-3 w-full">
          <img
            src={post.image_url}
            alt="投稿画像"
            className="w-full h-auto max-h-96 object-contain bg-muted"
            loading="lazy"
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
              className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
              loading="lazy"
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
        <div className="flex items-center justify-around">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCommentClick}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary h-9"
          >
            <MessageCircle className="h-5 w-5" />
            {commentsCount > 0 && (
              <span className="text-sm">{commentsCount}</span>
            )}
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
            onClick={handleShare}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary h-9"
          >
            {isCopied ? (
              <Check className="h-5 w-5" />
            ) : (
              <Share className="h-5 w-5" />
            )}
            <span className="text-sm">シェア</span>
          </Button>
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
