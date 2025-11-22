import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostComment } from "@/types/posts";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { MessageCircle } from "lucide-react";

interface CommentItemProps {
  comment: PostComment;
  onReply: (commentId: string, username: string) => void;
  level?: number;
}

export function CommentItem({ comment, onReply, level = 0 }: CommentItemProps) {
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
          <div className="flex items-center gap-2 mt-1">
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
