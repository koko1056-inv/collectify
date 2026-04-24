import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ThumbsUp, MessageSquare, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import {
  useCreateItemComment,
  useDeleteItemComment,
  useToggleCommentReaction,
} from "./useItemComments";
import type { ItemCommentNode } from "./types";
import { cn } from "@/lib/utils";

interface CommentItemProps {
  comment: ItemCommentNode;
  officialItemId: string;
  depth?: number;
}

export function CommentItem({ comment, officialItemId, depth = 0 }: CommentItemProps) {
  const { user } = useAuth();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const createMut = useCreateItemComment(officialItemId);
  const deleteMut = useDeleteItemComment(officialItemId);
  const reactMut = useToggleCommentReaction(officialItemId);

  const author = comment.profiles;
  const isMine = user?.id === comment.user_id;
  const isHelpful = comment.myReaction === "helpful";

  const submitReply = async () => {
    if (!replyText.trim()) return;
    await createMut.mutateAsync({ content: replyText, parentId: comment.id });
    setReplyText("");
    setReplyOpen(false);
  };

  return (
    <div className={cn("flex gap-3", depth > 0 && "ml-10 mt-3")}>
      <Link to={`/user/${author?.username || comment.user_id}`} className="flex-shrink-0">
        <Avatar className="h-9 w-9">
          <AvatarImage src={author?.avatar_url || ""} />
          <AvatarFallback>
            {(author?.display_name || author?.username || "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="bg-muted/50 rounded-2xl px-3 py-2">
          <Link
            to={`/user/${author?.username || comment.user_id}`}
            className="text-sm font-semibold hover:underline"
          >
            {author?.display_name || author?.username || "コレクター"}
          </Link>
          <p className="text-sm text-foreground whitespace-pre-wrap break-words mt-0.5">
            {comment.content}
          </p>
        </div>

        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground px-1">
          <span>
            {formatDistanceToNow(new Date(comment.created_at), {
              addSuffix: true,
              locale: ja,
            })}
          </span>
          <button
            onClick={() =>
              user &&
              reactMut.mutate({
                commentId: comment.id,
                reaction: "helpful",
                currentlyOn: isHelpful,
              })
            }
            disabled={!user || reactMut.isPending}
            className={cn(
              "flex items-center gap-1 hover:text-foreground transition-colors",
              isHelpful && "text-primary font-medium"
            )}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            参考になった
            {comment.helpful_count > 0 && (
              <span className="ml-0.5">({comment.helpful_count})</span>
            )}
          </button>
          {depth === 0 && user && (
            <button
              onClick={() => setReplyOpen((v) => !v)}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              返信
            </button>
          )}
          {isMine && (
            <button
              onClick={() => {
                if (confirm("このコメントを削除しますか？")) {
                  deleteMut.mutate(comment.id);
                }
              }}
              className="flex items-center gap-1 hover:text-destructive transition-colors ml-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {replyOpen && (
          <div className="mt-2 flex gap-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`${author?.display_name || author?.username}さんに返信...`}
              className="min-h-[60px] text-sm"
              maxLength={1000}
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                onClick={submitReply}
                disabled={createMut.isPending || !replyText.trim()}
              >
                {createMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "送信"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setReplyOpen(false)}>
                取消
              </Button>
            </div>
          </div>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-1">
            {comment.replies.map((r) => (
              <CommentItem
                key={r.id}
                comment={r}
                officialItemId={officialItemId}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
