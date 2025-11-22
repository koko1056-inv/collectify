import { Dialog, DialogContent } from "@/components/ui/dialog";
import { GoodsPost } from "@/types/posts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Share, Trash2, MoreHorizontal, X, XCircle } from "lucide-react";
import { useToggleLike, useDeletePost, usePostComments, useAddComment } from "@/hooks/posts";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { DeletePostDialog } from "./DeletePostDialog";
import { ShareModal } from "@/components/ShareModal";
import { CommentItem } from "./CommentItem";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostDetailModalProps {
  post: GoodsPost | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PostDetailModal({ post, isOpen, onClose }: PostDetailModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toggleLike = useToggleLike();
  const deletePost = useDeletePost();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const { data: comments, isLoading: commentsLoading } = usePostComments(post?.id || "");
  const addComment = useAddComment();

  if (!post) return null;

  const isLiked = post.post_likes?.some(like => like.user_id === user?.id) || false;
  const likesCount = post.post_likes?.length || 0;
  const commentsCount = post.post_comments?.length || 0;
  const isOwner = user?.id === post.user_id;

  const handleLike = () => {
    if (!user) return;
    toggleLike.mutate({ postId: post.id, isLiked });
  };

  const handleItemClick = () => {
    const officialItemId = post.user_items?.official_item_id;
    if (officialItemId) {
      navigate(`/search?item=${officialItemId}`);
      onClose();
    }
  };

  const handleDeletePost = () => {
    deletePost.mutate(post.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        onClose();
      }
    });
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !post) return;

    try {
      await addComment.mutateAsync({ 
        postId: post.id, 
        comment: newComment.trim(),
        parentCommentId: replyTo?.id 
      });
      setNewComment("");
      setReplyTo(null);
    } catch (error) {
      console.error("コメントの追加に失敗しました:", error);
    }
  };

  const handleReply = (commentId: string, username: string) => {
    setReplyTo({ id: commentId, username });
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full sm:max-w-5xl max-h-[90vh] p-0 overflow-y-auto">
          <div className="flex flex-col md:flex-row h-full">
            {/* 左側: 画像 */}
            <div className="flex-1 bg-black flex items-center justify-center relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-white hover:bg-white/20 z-10"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
              <img
                src={post.image_url}
                alt={post.caption || "投稿画像"}
                className="max-h-[90vh] w-full object-contain"
              />
            </div>

            {/* 右側: 詳細情報 */}
            <div className="w-full md:w-96 flex flex-col bg-background">
              {/* ヘッダー */}
              <div className="flex items-center gap-3 p-4 border-b">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={post.profiles?.avatar_url} />
                  <AvatarFallback>
                    {post.profiles?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{post.profiles?.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), { 
                      addSuffix: true, 
                      locale: ja 
                    })}
                  </p>
                </div>
                {isOwner && (
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
                )}
              </div>

              {/* キャプションとコメント */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {post.caption && (
                    <p className="text-sm mb-4">{post.caption}</p>
                  )}

                  {/* アイテム情報 */}
                  {post.user_items && (
                    <div 
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={handleItemClick}
                    >
                      {post.user_items.image && (
                        <img
                          src={post.user_items.image}
                          alt={post.user_items.title}
                          className="h-12 w-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{post.user_items.title}</p>
                        {post.user_items.content_name && (
                          <p className="text-xs text-muted-foreground">{post.user_items.content_name}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* コメント一覧 */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold mb-3">コメント</h3>
                    {commentsLoading ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">読み込み中...</div>
                    ) : comments && comments.length > 0 ? (
                      <div className="space-y-4">
                        {comments.map((comment) => (
                          <CommentItem
                            key={comment.id}
                            comment={comment}
                            onReply={handleReply}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        まだコメントがありません
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* アクションボタンとコメント入力 */}
              <div className="border-t p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLike}
                    className={isLiked ? "text-red-500" : ""}
                  >
                    <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
                    <span className="ml-1 text-sm">{likesCount}</span>
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MessageCircle className="h-5 w-5" />
                    <span className="ml-1 text-sm">{commentsCount}</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsShareModalOpen(true)}>
                    <Share className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* 返信先表示 */}
                {replyTo && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                    <span className="text-sm text-muted-foreground flex-1">
                      {replyTo.username}に返信中
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0"
                      onClick={cancelReply}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {/* コメント入力フォーム */}
                <form onSubmit={handleCommentSubmit} className="flex gap-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={replyTo ? `${replyTo.username}に返信...` : "コメントを追加..."}
                    className="flex-1"
                    disabled={addComment.isPending}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newComment.trim() || addComment.isPending}
                  >
                    {addComment.isPending ? "送信中..." : "送信"}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeletePostDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeletePost}
        isDeleting={deletePost.isPending}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        url={`${window.location.origin}/posts/${post.id}`}
        title="投稿を共有"
        image={post.image_url}
      />
    </>
  );
}
