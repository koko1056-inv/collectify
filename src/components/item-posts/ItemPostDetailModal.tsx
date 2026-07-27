import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  Send,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  useItemPost,
  useDeleteItemPost,
  ItemPost,
} from "@/hooks/item-posts/useItemPosts";
import {
  useItemPostComments,
  useCreateItemPostComment,
  useDeleteItemPostComment,
  useToggleItemPostLike,
} from "@/hooks/item-posts/useItemPostInteractions";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";

interface ItemPostDetailModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  postId: string | null;
  /** 既に取得済みのpost (一覧から渡す場合。なくてもOK) */
  initialPost?: ItemPost | null;
}

export function ItemPostDetailModal({
  open,
  onOpenChange,
  postId,
  initialPost,
}: ItemPostDetailModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { formatRelative } = useDateFormat();
  const navigate = useNavigate();
  const { data: fetchedPost, isLoading } = useItemPost(open ? postId : null);
  const post = fetchedPost ?? initialPost ?? null;
  const [imageIdx, setImageIdx] = useState(0);

  const { data: comments = [] } = useItemPostComments(open ? postId : null);

  const toggleLike = useToggleItemPostLike();
  const deletePost = useDeleteItemPost();
  const createComment = useCreateItemPostComment();
  const deleteComment = useDeleteItemPostComment();

  useEffect(() => {
    if (!open) setImageIdx(0);
  }, [open, postId]);

  if (!post) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader className="sr-only">
            <DialogTitle>{t("social.itemPosts.loadingPost")}</DialogTitle>
          </DialogHeader>
          <div className="py-10 flex justify-center">
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <p className="text-sm text-muted-foreground">{t("social.itemPosts.postNotFound")}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isOwner = user?.id === post.user_id;
  const hasMultiple = post.images.length > 1;
  const currentImage = post.images[imageIdx];

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ url: shareUrl, title: t("social.itemPosts.shareTitle") });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(t("social.itemPosts.urlCopied"));
      }
    } catch {
      /* cancelled */
    }
  };

  const handleDelete = async () => {
    if (!confirm(t("social.itemPosts.confirmDelete"))) return;
    try {
      await deletePost.mutateAsync(post.id);
      onOpenChange(false);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] p-0 overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("social.itemPosts.postDetail")}</DialogTitle>
        </DialogHeader>

        {/* 画像カルーセル */}
        <div className="relative bg-black">
          <div className="relative aspect-square">
            {currentImage && (
              <img
                src={currentImage.image_url}
                alt=""
                className="w-full h-full object-contain"
              />
            )}
            {hasMultiple && (
              <>
                <button
                  onClick={() => setImageIdx((i) => Math.max(0, i - 1))}
                  disabled={imageIdx === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    setImageIdx((i) => Math.min(post.images.length - 1, i + 1))
                  }
                  disabled={imageIdx === post.images.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {post.images.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all",
                        i === imageIdx ? "bg-white w-4" : "bg-white/40"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* 投稿者情報 */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onOpenChange(false);
                navigate(`/user/${post.user_id}`);
              }}
            >
              <Avatar className="w-10 h-10 border">
                <AvatarImage src={post.profile?.avatar_url || undefined} />
                <AvatarFallback>
                  {(post.profile?.display_name ||
                    post.profile?.username ||
                    "?")[0]}
                </AvatarFallback>
              </Avatar>
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {post.profile?.display_name || post.profile?.username || t("social.itemPosts.collector")}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatRelative(post.created_at)}
              </p>
            </div>
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                disabled={deletePost.isPending}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* キャプション */}
          {post.caption && (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {renderCaption(post.caption)}
            </p>
          )}

          {/* アクション */}
          <div className="flex items-center gap-3 pt-1 border-t border-border">
            <button
              onClick={() =>
                toggleLike.mutate({
                  postId: post.id,
                  currentlyLiked: !!post.is_liked_by_me,
                })
              }
              disabled={!user || toggleLike.isPending}
              className="flex items-center gap-1.5 py-2 text-sm font-medium disabled:opacity-50"
            >
              <Heart
                className={cn(
                  "w-5 h-5 transition-all",
                  post.is_liked_by_me
                    ? "fill-rose-500 text-rose-500 scale-110"
                    : "text-muted-foreground"
                )}
              />
              {post.like_count}
            </button>
            <div className="flex items-center gap-1.5 py-2 text-sm font-medium text-muted-foreground">
              <MessageCircle className="w-5 h-5" />
              {post.comment_count}
            </div>
            <button
              onClick={handleShare}
              className="ml-auto flex items-center gap-1.5 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* コメント */}
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarImage src={c.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {(c.profile?.display_name || c.profile?.username || "?")[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-xs font-medium truncate">
                      {c.profile?.display_name || c.profile?.username || t("social.itemPosts.anonymous")}
                    </p>
                    <p className="text-[10px] text-muted-foreground shrink-0">
                      {formatRelative(c.created_at)}
                    </p>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {c.content}
                  </p>
                </div>
                {user?.id === c.user_id && (
                  <button
                    onClick={() =>
                      deleteComment.mutate({ commentId: c.id, postId: post.id })
                    }
                    className="text-muted-foreground hover:text-destructive shrink-0 self-start"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-xs text-center text-muted-foreground py-2">
                {t("social.itemPosts.firstComment")}
              </p>
            )}
          </div>

          {/* コメント入力 */}
          <CommentInput
            postId={post.id}
            onSubmit={(content) => createComment.mutateAsync({ postId: post.id, content })}
            disabled={!user}
            sending={createComment.isPending}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CommentInput({
  postId,
  onSubmit,
  disabled,
  sending,
}: {
  postId: string;
  onSubmit: (content: string) => Promise<any>;
  disabled?: boolean;
  sending?: boolean;
}) {
  const { t } = useLanguage();
  const [value, setValue] = useState("");
  const submit = async () => {
    if (!value.trim()) return;
    try {
      await onSubmit(value);
      setValue("");
    } catch {}
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-center gap-2 pt-2 border-t border-border"
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={disabled ? t("social.itemPosts.loginToComment") : t("social.itemPosts.addComment")}
        disabled={disabled || sending}
        maxLength={500}
        className="flex-1 rounded-full"
      />
      <Button
        type="submit"
        size="icon"
        disabled={!value.trim() || disabled || sending}
        className="rounded-full shrink-0"
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </Button>
    </form>
  );
}

/** キャプションの #hashtag を青いリンクに */
function renderCaption(caption: string) {
  const parts = caption.split(/(#[^\s#]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("#")) {
      return (
        <a
          key={i}
          href={`/posts?tag=${encodeURIComponent(part.slice(1))}`}
          className="text-primary hover:underline"
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
