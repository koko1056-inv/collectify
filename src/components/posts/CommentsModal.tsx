
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePostComments, useAddComment } from "@/hooks/posts";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";

interface CommentsModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentsModal({ postId, isOpen, onClose }: CommentsModalProps) {
  const { t } = useLanguage();
  const { formatRelative } = useDateFormat();
  const [newComment, setNewComment] = useState("");
  const { data: comments, isLoading, error } = usePostComments(postId);
  const addComment = useAddComment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await addComment.mutateAsync({ postId, comment: newComment.trim() });
      setNewComment("");
    } catch (error) {
      console.error("コメントの追加に失敗しました:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("social.posts.commentsTitle")}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {isLoading ? (
            <div className="text-center py-4">{t("social.posts.loading")}</div>
          ) : error ? (
            <div className="text-center py-4 text-red-500">
              {t("social.posts.commentsLoadError")}
            </div>
          ) : comments && comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start space-x-3">
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
                    <p className="text-sm text-foreground mt-1">
                      {comment.comment}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatRelative(comment.created_at)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon={MessageCircle}
              title={t("social.posts.noComments")}
              className="py-4"
            />
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t("social.posts.commentPlaceholder")}
            className="flex-1"
            disabled={addComment.isPending}
          />
          <Button
            type="submit"
            disabled={!newComment.trim() || addComment.isPending}
          >
            {addComment.isPending ? t("social.posts.sending") : t("social.posts.send")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
