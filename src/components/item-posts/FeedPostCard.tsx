import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Heart, Loader2, MessageCircle, Send, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useCreateItemPostComment, useToggleItemPostLike } from "@/hooks/item-posts/useItemPostInteractions";
import type { FeedPost } from "@/hooks/item-posts/useItemPostsFeed";
import { pockeCheer } from "@/components/pocke/pockeCheer";
import { ReportBlockMenu } from "@/components/safety/ReportBlockMenu";
import { fallbackToOriginal, getAvatarImageUrl, getOptimizedImageUrl } from "@/utils/optimized-image";
import { sharePost } from "./sharePost";

/** 1回目のタップから、2回目（ダブルタップ）を待つ時間。これを過ぎたら1回のタップとして詳細を開く */
const DOUBLE_TAP_MS = 260;

interface FeedPostCardProps {
  post: FeedPost;
  /** 詳細（全コメント）を開く */
  onOpen: (post: FeedPost) => void;
  /** キャプションの #タグ を押したとき（フィードをそのタグで絞り込む） */
  onTagClick?: (tag: string) => void;
  /** 先頭の数枚は画像をすぐ読む */
  eager?: boolean;
}

/**
 * 投稿タブの SNS 風カード（Instagram / X のタイムラインの 1 件）。
 * 投稿者 → 写真（複数枚は横スワイプ）→ いいね・コメント・シェア → キャプション → 最新コメント 2 件 → コメント入力。
 * 写真をタップしないとコメントが見えなかった（グリッドのマスだけだった）ので、カードの中で読めて書けるようにした。
 * プロフィールの投稿一覧などは今までどおり ItemPostGrid（マス）を使う。
 */
export const FeedPostCard = memo(function FeedPostCard({ post, onOpen, onTagClick, eager }: FeedPostCardProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { formatAgo } = useDateFormat();
  const navigate = useNavigate();
  const toggleLike = useToggleItemPostLike();
  const reduceMotion = !!useReducedMotion();

  const name = post.profile?.display_name || post.profile?.username || t("social.itemPosts.collector");
  const liked = !!post.is_liked_by_me;
  const commentInputRef = useRef<HTMLInputElement>(null);

  // ダブルタップのハート
  const [burst, setBurst] = useState(0);
  const tapTimer = useRef<number>();
  useEffect(() => () => window.clearTimeout(tapTimer.current), []);

  const like = (next: boolean) => {
    if (!user) {
      pockeCheer("likeGuest");
      return;
    }
    if (toggleLike.isPending || next === liked) return;
    toggleLike.mutate({ postId: post.id, currentlyLiked: liked });
  };

  // 1回のタップ → 詳細。すぐ2回目が来たら → いいね（Instagram と同じく、ダブルタップでは取り消さない）
  const onImageTap = () => {
    if (tapTimer.current) {
      window.clearTimeout(tapTimer.current);
      tapTimer.current = undefined;
      setBurst((b) => b + 1);
      like(true);
      return;
    }
    tapTimer.current = window.setTimeout(() => {
      tapTimer.current = undefined;
      onOpen(post);
    }, DOUBLE_TAP_MS);
  };

  const openProfile = () => navigate(`/user/${post.user_id}`);
  const focusComment = () => {
    if (!user) {
      onOpen(post);
      return;
    }
    commentInputRef.current?.focus();
  };

  const previewCount = post.preview_comments.length;
  const [imageIdx, setImageIdx] = useState(0);

  return (
    <article className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm" aria-label={name}>
      {/* 投稿者 */}
      <header className="flex items-center gap-2.5 px-3 py-2.5">
        <button
          type="button"
          onClick={openProfile}
          aria-label={t("social.itemPosts.openProfile", { name })}
          className="shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Avatar className="h-9 w-9 border">
            <AvatarImage
              src={getAvatarImageUrl(post.profile?.avatar_url, 96)}
              onError={fallbackToOriginal(post.profile?.avatar_url)}
              alt=""
            />
            <AvatarFallback className="text-xs">{name[0]}</AvatarFallback>
          </Avatar>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <button type="button" onClick={openProfile} className="min-w-0 truncate text-sm font-bold hover:underline">
              {name}
            </button>
            {post.profile?.is_sample && (
              <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-3xs font-medium">
                {t("social.itemPosts.sampleBadge")}
              </Badge>
            )}
          </div>
          <time dateTime={post.created_at} className="block text-2xs text-muted-foreground">
            {formatAgo(post.created_at)}
          </time>
        </div>
        <ReportBlockMenu
          targetType="item_post"
          targetId={post.id}
          ownerId={post.user_id}
          ownerName={post.profile?.display_name || post.profile?.username}
        />
      </header>

      {/* 写真 */}
      <ImageCarousel post={post} eager={eager} onTap={onImageTap} index={imageIdx} onIndexChange={setImageIdx}>
        <AnimatePresence>
          {burst > 0 && (
            <motion.div
              key={burst}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: [0, 1, 1, 0], scale: [0.4, 1.15, 1, 1.05] }}
              exit={{ opacity: 0 }}
              transition={reduceMotion ? { duration: 0.15 } : { duration: 0.8, times: [0, 0.25, 0.7, 1] }}
              onAnimationComplete={() => setBurst(0)}
            >
              <Heart className="h-24 w-24 fill-white text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]" />
            </motion.div>
          )}
        </AnimatePresence>
      </ImageCarousel>

      <div className="space-y-1.5 px-3 pb-3 pt-1.5">
        {/* いいね・コメント・シェア */}
        <div className="relative -ml-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => like(!liked)}
            aria-pressed={liked}
            aria-label={`${liked ? t("social.itemPosts.unlike") : t("social.itemPosts.like")}（${t("social.itemPosts.likeCount", { count: post.like_count })}）`}
            className="flex h-10 items-center gap-1.5 rounded-full px-2 text-sm font-medium tabular-nums active:scale-95"
          >
            <Heart
              className={cn(
                "h-6 w-6 transition-transform motion-reduce:transition-none",
                liked ? "scale-110 fill-primary text-primary" : "text-foreground"
              )}
            />
            <span aria-hidden="true">{post.like_count}</span>
          </button>
          <button
            type="button"
            onClick={focusComment}
            aria-label={`${t("social.itemPosts.comment")}（${t("social.itemPosts.commentCount", { count: post.comment_count })}）`}
            className="flex h-10 items-center gap-1.5 rounded-full px-2 text-sm font-medium tabular-nums active:scale-95"
          >
            <MessageCircle className="h-6 w-6" />
            <span aria-hidden="true">{post.comment_count}</span>
          </button>
          <button
            type="button"
            onClick={() => void sharePost(post, t)}
            aria-label={t("social.itemPosts.share")}
            className="flex h-10 items-center rounded-full px-2 active:scale-95"
          >
            <Share2 className="h-[22px] w-[22px]" />
          </button>
          {post.images.length > 1 && <Dots count={post.images.length} active={imageIdx} />}
        </div>

        {/* キャプション */}
        {post.caption && <Caption name={name} caption={post.caption} onTagClick={onTagClick} />}

        {/* 最新コメント */}
        {post.comment_count > previewCount && (
          <button
            type="button"
            onClick={() => onOpen(post)}
            className="block text-sm text-muted-foreground hover:text-foreground"
          >
            {t("social.itemPosts.viewAllComments", { count: post.comment_count })}
          </button>
        )}
        {previewCount > 0 && (
          <ul className="space-y-0.5">
            {post.preview_comments.map((c) => (
              <li key={c.id} className="line-clamp-2 break-words text-sm">
                <span className="mr-1.5 font-bold">
                  {c.profile?.display_name || c.profile?.username || t("social.itemPosts.anonymous")}
                </span>
                {c.content}
              </li>
            ))}
          </ul>
        )}

        <InlineComment postId={post.id} inputRef={commentInputRef} />
      </div>
    </article>
  );
});

/** 写真。複数枚は横スワイプ（スクロールスナップ）。今の枚数は右上と、アクション行のドットで出す */
function ImageCarousel({
  post,
  eager,
  onTap,
  index: idx,
  onIndexChange,
  children,
}: {
  post: FeedPost;
  eager?: boolean;
  onTap: () => void;
  index: number;
  onIndexChange: (i: number) => void;
  children?: React.ReactNode;
}) {
  const { t } = useLanguage();
  const scroller = useRef<HTMLDivElement>(null);
  const total = post.images.length;

  const onScroll = () => {
    const el = scroller.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx) onIndexChange(i);
  };

  return (
    <div className="relative bg-muted">
      <div
        ref={scroller}
        role="button"
        tabIndex={0}
        aria-label={t("social.itemPosts.openPost")}
        onClick={onTap}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onTap();
          }
        }}
        onScroll={total > 1 ? onScroll : undefined}
        className={cn(
          "flex aspect-square w-full touch-manipulation select-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
          total > 1 && "snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        {post.images.map((img, i) => (
          <div key={img.id} className="relative h-full w-full shrink-0 snap-center">
            {/* フィードは 1 列（スマホで約 360px 幅）。高密度の画面でも 800px あれば足りる */}
            <img
              src={getOptimizedImageUrl(img.image_url, { width: 800 })}
              onError={fallbackToOriginal(img.image_url)}
              alt={total > 1 ? t("social.itemPosts.imageOf", { n: i + 1, total }) : ""}
              className="h-full w-full object-cover"
              loading={eager && i === 0 ? "eager" : "lazy"}
              fetchPriority={eager && i === 0 ? "high" : undefined}
              decoding="async"
              draggable={false}
            />
          </div>
        ))}
      </div>
      {total > 1 && (
        <span className="pointer-events-none absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-2xs font-medium tabular-nums text-white backdrop-blur-sm">
          {idx + 1}/{total}
        </span>
      )}
      {children}
    </div>
  );
}

/** 複数枚のときの位置のドット（アクション行の中央） */
function Dots({ count, active }: { count: number; active: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 gap-1">
      {Array.from({ length: Math.min(count, 10) }).map((_, i) => (
        <span
          key={i}
          className={cn("h-1.5 w-1.5 rounded-full transition-colors", i === active ? "bg-primary" : "bg-muted-foreground/30")}
        />
      ))}
    </div>
  );
}

/** キャプション（2〜3行で畳み、「もっと見る」で全文）。#タグ はフィードの絞り込みに */
function Caption({ name, caption, onTagClick }: { name: string; caption: string; onTagClick?: (tag: string) => void }) {
  const { t } = useLanguage();
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [caption, expanded]);

  return (
    <div className="text-sm leading-relaxed">
      <p ref={ref} className={cn("whitespace-pre-wrap break-words", !expanded && "line-clamp-3")}>
        <span className="mr-1.5 font-bold">{name}</span>
        {caption.split(/(#[^\s#]+)/g).map((part, i) =>
          part.startsWith("#") && part.length > 1 ? (
            <button
              key={i}
              type="button"
              onClick={() => onTagClick?.(part.slice(1))}
              className="text-primary hover:underline"
            >
              {part}
            </button>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </p>
      {clamped && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t("social.itemPosts.readMore")}
        </button>
      )}
    </div>
  );
}

/** カードの下のコメント入力。ゲストにはログインへの案内を出す（詳細と同じく、ゲストは書けない） */
function InlineComment({ postId, inputRef }: { postId: string; inputRef: React.RefObject<HTMLInputElement> }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const createComment = useCreateItemPostComment();
  const [value, setValue] = useState("");

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`)}
        className="mt-1 block w-full rounded-full border border-dashed border-border px-3 py-2 text-left text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground"
      >
        {t("social.itemPosts.loginToCommentCta")}
      </button>
    );
  }

  const sending = createComment.isPending;
  const submit = async () => {
    if (!value.trim() || sending) return;
    try {
      await createComment.mutateAsync({ postId, content: value });
      setValue("");
    } catch {
      // 失敗の知らせは useCreateItemPostComment が出す。書いた文は残しておく
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="mt-1 flex items-center gap-1 border-t border-border/60 pt-2"
    >
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("social.itemPosts.addComment")}
        aria-label={t("social.itemPosts.addComment")}
        maxLength={500}
        disabled={sending}
        enterKeyHint="send"
        className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:text-muted-foreground sm:text-sm"
      />
      <button
        type="submit"
        disabled={!value.trim() || sending}
        aria-label={t("social.itemPosts.sendComment")}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary disabled:text-muted-foreground/50"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </button>
    </form>
  );
}

/** 次のページを読んでいるあいだのカード */
export function FeedPostCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card" aria-hidden="true">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-2.5 w-14" />
        </div>
      </div>
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 px-3 py-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}
