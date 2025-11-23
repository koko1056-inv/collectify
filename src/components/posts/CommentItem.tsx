import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostComment } from "@/types/posts";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { MessageCircle, Heart } from "lucide-react";
import { useToggleCommentLike } from "@/hooks/posts";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface CommentItemProps {
  comment: PostComment;
  onReply: (commentId: string, username: string) => void;
  level?: number;
}

export function CommentItem({ comment, onReply, level = 0 }: CommentItemProps) {
  const { user } = useAuth();
  const toggleLike = useToggleCommentLike();
  
  const isLiked = comment.comment_likes?.some(like => like.user_id === user?.id) || false;
  const likesCount = comment.comment_likes?.length || 0;

  const handleLike = () => {
    if (!user) return;
    toggleLike.mutate({ commentId: comment.id, isLiked });
  };
  return (
    <div className={`${level > 0 ? "ml-8 mt-2" : ""}`}>
      <div className="flex items-start space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.profiles?.avatar_url} />
          <AvatarFallback>
            {comment.profiles?.username?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-sm font-semibold">
              {comment.profiles?.username || 'Unknown User'}
            </p>
            <p className="text-sm mt-1">
              {comment.comment}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: true,
                locale: ja,
              })}
            </p>
            {level < 2 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onReply(comment.id, comment.profiles?.username || 'Unknown User')}
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                返信
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-auto p-0 text-xs flex items-center gap-1",
                isLiked ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={handleLike}
              disabled={!user || toggleLike.isPending}
            >
              <Heart className={cn("h-3 w-3", isLiked && "fill-current")} />
              {likesCount > 0 && <span>{likesCount}</span>}
            </Button>
          </div>
        </div>
      </div>
      
      {/* 返信コメント */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
