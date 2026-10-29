import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Gift, Heart, Link2, Loader2, MessageCircle, PackageCheck, Share, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useCreateItemPostComment, useToggleItemPostLike } from "@/hooks/item-posts/useItemPostInteractions";
import { isTextOnlyPost, useDeleteItemPost } from "@/hooks/item-posts/useItemPosts";
import { useToggleReaction, type PostReactionSummary, type ReactionKind } from "@/hooks/item-posts/useItemPostReactions";
import type { FeedGoods, FeedPost } from "@/hooks/item-posts/useItemPostsFeed";
import { pockeCheer } from "@/components/pocke/pockeCheer";
import { ReportBlockMenu } from "@/components/safety/ReportBlockMenu";
import { PublicUserItemModal } from "@/components/item-details/PublicUserItemModal";
import { SITE_URL } from "@/config/site";
import { fallbackToOriginal, getAvatarImageUrl, getOptimizedImageUrl } from "@/utils/optimized-image";
import { sharePost } from "./sharePost";
import { DeletePostDialog } from "@/components/posts/DeletePostDialog";
import { EventBadge } from "@/components/events/EventBadge";

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
  /** 持ってる・ほしいの数と自分の反応（フィードがページの投稿ぶんまとめて読んだもの） */
  reactions?: PostReactionSummary;
}

/**
 * 投稿タブの 1 件（X のタイムラインの 1 行のかたち）。
 * 左にアバターの列、右に 名前・@ID・時刻 → 本文 → 写真 → グッズの札 → 返信・いいね・持ってる・ほしい・シェア → 返信の先頭 2 件 → 返信の入力。
 * カードの枠は付けず、行の間は細い線で区切る。プロフィールの投稿一覧などは今までどおり ItemPostGrid（マス）。
 */
export const FeedPostCard = memo(function FeedPostCard({ post, onOpen, onTagClick, eager, reactions }: FeedPostCardProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { formatAgo } = useDateFormat();
  const navigate = useNavigate();
  const toggleLike = useToggleItemPostLike();
  const reduceMotion = !!useReducedMotion();

  const name = post.profile?.display_name || post.profile?.username || t("social.itemPosts.collector");
  // @ID は表示名と別に username があるときだけ（同じなら繰り返さない）
  const handle =
    post.profile?.display_name && post.profile?.username && post.profile.username !== post.profile.display_name
      ? post.profile.username
      : null;
  const liked = !!post.is_liked_by_me;
  const replyRef = useRef<HTMLTextAreaElement>(null);

  // ダブルタップのハート・いいねボタンのはずみ
  const [burst, setBurst] = useState(0);
  const [pop, setPop] = useState(0);
  const tapTimer = useRef<number>();
  useEffect(() => () => window.clearTimeout(tapTimer.current), []);

  const like = (next: boolean) => {
    if (!user) {
      pockeCheer("likeGuest");
      return;
    }
    if (toggleLike.isPending || next === liked) return;
    if (next) setPop((n) => n + 1);
    toggleLike.mutate({ postId: post.id, currentlyLiked: liked });
  };

  // 1回のタップ → 詳細。すぐ2回目が来たら → いいね（Instagram と同じく、ダブルタップでは取り消さない）
  const onMediaTap = () => {
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
  const focusReply = () => {
    if (!user) {
      onOpen(post);
      return;
    }
    replyRef.current?.focus();
  };

  const previewCount = post.preview_comments.length;
  const textOnly = isTextOnlyPost(post);

  return (
    <article className="flex gap-3 border-b border-border/70 px-4 pb-2 pt-3" aria-label={name}>
      {/* アバターの列 */}
      <button
        type="button"
        onClick={openProfile}
        aria-label={t("social.itemPosts.openProfile", { name })}
        className="h-10 w-10 shrink-0 self-start rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Avatar className="h-10 w-10">
          <AvatarImage
            src={getAvatarImageUrl(post.profile?.avatar_url, 96)}
            onError={fallbackToOriginal(post.profile?.avatar_url)}
            alt=""
          />
          <AvatarFallback className="text-sm">{name[0]}</AvatarFallback>
        </Avatar>
      </button>

      {/* 中身の列 */}
      <div className="min-w-0 flex-1">
        <header className="flex h-5 min-w-0 items-center gap-1 text-sm leading-5">
          <button
            type="button"
            onClick={openProfile}
            className="min-w-0 max-w-[65%] shrink truncate font-bold hover:underline"
          >
            {name}
          </button>
          {handle && <span className="min-w-0 truncate text-muted-foreground">@{handle}</span>}
          <span aria-hidden="true" className="shrink-0 text-muted-foreground">·</span>
          {/* 時刻は投稿へのリンク（X と同じ）。文字だけの投稿は写真がないので、ここか本文から詳細をひらく */}
          <button
            type="button"
            onClick={() => onOpen(post)}
            aria-label={t("social.itemPosts.openPost")}
            className="shrink-0 text-muted-foreground hover:underline"
          >
            <time dateTime={post.created_at}>{formatAgo(post.created_at)}</time>
          </button>
          <PostMenu post={post} className="-my-1.5 -mr-2 ml-auto" />
        </header>

        {post.event_id && <EventBadge eventId={post.event_id} />}

        {post.caption && (
          <Caption
            caption={post.caption}
            onTagClick={onTagClick}
            // 文字だけの投稿は本文が主役。本文のタップで詳細をひらく（#タグ・もっと見るのボタンは除く）
            onOpen={textOnly ? () => onOpen(post) : undefined}
          />
        )}

        {!textOnly && (
        <PostMedia post={post} eager={eager} onTap={onMediaTap}>
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
                <Heart className="h-20 w-20 fill-white text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]" />
              </motion.div>
            )}
          </AnimatePresence>
        </PostMedia>
        )}

        {post.goods && <GoodsChip goods={post.goods} ownerId={post.user_id} />}

        {/* 返信・いいね・持ってる・ほしい・シェア（X のように均等に並べ、色は押したとき・触れたときだけ） */}
        <div className="-ml-2 mt-1 flex max-w-md items-center justify-between">
          <ActionButton
            icon={MessageCircle}
            count={post.comment_count}
            label={`${t("social.itemPosts.comment")}（${t("social.itemPosts.commentCount", { count: post.comment_count })}）`}
            tone="info"
            onClick={focusReply}
          />
          <ActionButton
            icon={Heart}
            count={post.like_count}
            label={`${liked ? t("social.itemPosts.unlike") : t("social.itemPosts.like")}（${t("social.itemPosts.likeCount", { count: post.like_count })}）`}
            tone="primary"
            active={liked}
            pressed={liked}
            popKey={reduceMotion ? 0 : pop}
            onClick={() => like(!liked)}
          />
          <ReactionButtons postId={post.id} summary={reactions} />
          <ActionButton
            icon={Share}
            label={t("social.itemPosts.share")}
            tone="primary"
            onClick={() => void sharePost(post, t)}
          />
        </div>

        {/* 返信（新しい 2 件を、本文の列に寄せて細い線でつなぐ） */}
        {previewCount > 0 && (
          <ul className="mb-1 mt-0.5 space-y-2 border-l-2 border-border/70 pl-3" aria-label={t("social.itemPosts.repliesLabel")}>
            {post.preview_comments.map((c) => {
              const cName = c.profile?.display_name || c.profile?.username || t("social.itemPosts.anonymous");
              return (
                <li key={c.id} className="flex gap-2">
                  <Avatar className="mt-0.5 h-5 w-5 shrink-0">
                    <AvatarImage src={getAvatarImageUrl(c.profile?.avatar_url, 48)} onError={fallbackToOriginal(c.profile?.avatar_url)} alt="" />
                    <AvatarFallback className="text-3xs">{cName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-sm leading-snug">
                    <p className="flex min-w-0 items-center gap-1">
                      <span className="min-w-0 truncate font-bold">{cName}</span>
                      <span aria-hidden="true" className="shrink-0 text-muted-foreground">·</span>
                      <time dateTime={c.created_at} className="shrink-0 text-xs text-muted-foreground">
                        {formatAgo(c.created_at)}
                      </time>
                    </p>
                    <p className="line-clamp-2 whitespace-pre-wrap break-words">{c.content}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {post.comment_count > previewCount && (
          <button
            type="button"
            onClick={() => onOpen(post)}
            className="block py-1 text-sm text-primary hover:underline"
          >
            {t("social.itemPosts.showComments", { count: post.comment_count })}
          </button>
        )}

        <InlineReply postId={post.id} inputRef={replyRef} />
      </div>
    </article>
  );
});

const TONES = {
  info: { hover: "hover:text-info", bubble: "group-hover:bg-info/10", active: "text-info" },
  primary: { hover: "hover:text-primary", bubble: "group-hover:bg-primary/10", active: "text-primary" },
  success: { hover: "hover:text-success", bubble: "group-hover:bg-success/10", active: "text-success" },
  warning: { hover: "hover:text-warning", bubble: "group-hover:bg-warning/10", active: "text-warning" },
} as const;

/** アクション行のボタン（アイコン + 数）。ふだんは薄い灰色、触れる・押すとその色 */
function ActionButton({
  icon: Icon,
  count,
  label,
  tone,
  active,
  pressed,
  popKey = 0,
  onClick,
}: {
  icon: typeof Heart;
  count?: number;
  label: string;
  tone: keyof typeof TONES;
  active?: boolean;
  pressed?: boolean;
  /** 変わるたびにアイコンをぽんと弾ませる（0 のときは動かさない） */
  popKey?: number;
  onClick: () => void;
}) {
  const c = TONES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn(
        "group flex h-9 min-w-[2.75rem] items-center gap-0.5 text-xs tabular-nums transition-colors",
        active ? c.active : cn("text-muted-foreground", c.hover)
      )}
    >
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-full transition-colors", c.bubble)}>
        <motion.span
          key={popKey}
          className="flex"
          initial={popKey > 0 ? { scale: 0.5 } : false}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 12 }}
        >
          <Icon className={cn("h-[18px] w-[18px]", active && tone === "primary" && "fill-current")} />
        </motion.span>
      </span>
      {count !== undefined && <span aria-hidden="true" className="min-w-[1ch]">{count > 0 ? count : ""}</span>}
    </button>
  );
}

const REACTION_ICON: Record<"have" | "want", typeof Heart> = { have: PackageCheck, want: Gift };
const REACTION_TONE: Record<"have" | "want", keyof typeof TONES> = { have: "success", want: "warning" };

/** 持ってる・ほしい（詳細の反応と同じ）。数はフィードがまとめて読んだもの。押したらすぐ見た目を変える */
function ReactionButtons({ postId, summary }: { postId: string; summary?: PostReactionSummary }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const toggle = useToggleReaction();
  // 押してから数を取り直すまでの間の見た目
  const [optimistic, setOptimistic] = useState<Partial<Record<ReactionKind, boolean>>>({});

  return (
    <>
      {(["have", "want"] as const).map((kind) => {
        const serverMine = !!summary?.mine.has(kind);
        const mine = optimistic[kind] ?? serverMine;
        const count = (summary?.counts[kind] ?? 0) + (mine === serverMine ? 0 : mine ? 1 : -1);
        const label = `${t(`engage.posts.reaction.${kind}`)}（${count}）`;
        return (
          <ActionButton
            key={kind}
            icon={REACTION_ICON[kind]}
            count={Math.max(0, count)}
            label={label}
            tone={REACTION_TONE[kind]}
            active={mine}
            pressed={mine}
            onClick={() => {
              if (!user) {
                pockeCheer("likeGuest");
                return;
              }
              if (toggle.isPending) return;
              setOptimistic((o) => ({ ...o, [kind]: !mine }));
              toggle.mutate(
                { postId, kind, active: mine },
                { onSettled: () => setOptimistic((o) => ({ ...o, [kind]: undefined })) }
              );
            }}
          />
        );
      })}
    </>
  );
}

/** 「⋯」: シェア・リンクのコピー・（自分の投稿なら）削除・（人の投稿なら）通報・ブロック */
function PostMenu({ post, className }: { post: FeedPost; className?: string }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const deletePost = useDeleteItemPost();
  const isOwner = !!user && user.id === post.user_id;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${SITE_URL}/post/${post.id}`);
      toast.success(t("social.itemPosts.urlCopied"));
    } catch {
      toast.error(t("engage.share.copyFailed"));
    }
  };

  // 確かめは window.confirm ではなくアプリのダイアログで（アプリ内ブラウザ・ホーム画面のアプリでは
  // confirm が出ない／すぐ false が返ることがあり、押しても何も起きなかった）
  const [confirmOpen, setConfirmOpen] = useState(false);
  const remove = () => {
    setConfirmOpen(false);
    deletePost.mutate(post.id);
  };

  return (
    <>
      <ReportBlockMenu
        targetType="item_post"
        targetId={post.id}
        ownerId={post.user_id}
        ownerName={post.profile?.display_name || post.profile?.username}
        className={className}
        triggerClassName="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
        extraItems={
          <>
            <DropdownMenuItem onSelect={() => void sharePost(post, t)}>
              <Share className="mr-2 h-4 w-4" />
              {t("social.itemPosts.share")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void copyLink()}>
              <Link2 className="mr-2 h-4 w-4" />
              {t("social.itemPosts.copyLink")}
            </DropdownMenuItem>
            {isOwner && (
              <DropdownMenuItem
                onSelect={() => setConfirmOpen(true)}
                disabled={deletePost.isPending}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("social.itemPosts.deletePost")}
              </DropdownMenuItem>
            )}
          </>
        }
      />
      {isOwner && (
        <DeletePostDialog
          isOpen={confirmOpen}
          onOpenChange={setConfirmOpen}
          onConfirm={remove}
          isDeleting={deletePost.isPending}
        />
      )}
    </>
  );
}

// 写真の縦横比は保存していないので、読み込んだときに覚えておく（同じ写真を次に出すときはずれない）
const ratioCache = new Map<string, number>();
/** 1 枚のときの縦横比の範囲（縦長は 3:4 まで、横長は 1.91:1 まで。はみ出す分は object-cover で切る） */
const clampRatio = (r: number) => Math.min(1.91, Math.max(0.75, r));

/**
 * 写真。角丸 16px と細い枠で、本文の列の中に置く。
 * 1 枚: 縦横比は保存されていないので、まず正方形の箱で場所を取り、読めたらその写真の比率（3:4〜1.91:1）に合わせる。
 * 2〜4 枚: X と同じ 2 / 3 / 4 分割。5 枚以上は 4 枚目に「+N」。どれをタップしても詳細をひらく。
 */
function PostMedia({
  post,
  eager,
  onTap,
  children,
}: {
  post: FeedPost;
  eager?: boolean;
  onTap: () => void;
  children?: React.ReactNode;
}) {
  const { t } = useLanguage();
  const total = post.images.length;
  const shown = post.images.slice(0, 4);
  const first = post.images[0];
  const [ratio, setRatio] = useState(() => (first && ratioCache.get(first.image_url)) || 1);

  const onSingleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img.naturalWidth || !img.naturalHeight || !first) return;
    const r = clampRatio(img.naturalWidth / img.naturalHeight);
    ratioCache.set(first.image_url, r);
    if (Math.abs(r - ratio) > 0.02) setRatio(r);
  };

  return (
    <div
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
      className={cn(
        "relative mt-2 w-full touch-manipulation select-none overflow-hidden rounded-2xl border border-border/70 bg-muted",
        "max-h-[520px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        total > 1 && "grid aspect-[4/3] gap-0.5 grid-cols-2",
        total >= 3 && "grid-rows-2"
      )}
      style={total === 1 ? { aspectRatio: String(ratio) } : undefined}
    >
      {shown.map((img, i) => (
        <div
          key={img.id}
          className={cn("relative min-h-0 overflow-hidden", total === 1 && "h-full w-full", total === 3 && i === 0 && "row-span-2")}
        >
          <img
            src={getOptimizedImageUrl(img.image_url, { width: total === 1 ? 800 : 480 })}
            onError={fallbackToOriginal(img.image_url)}
            onLoad={total === 1 ? onSingleLoad : undefined}
            alt={total > 1 ? t("social.itemPosts.imageOf", { n: i + 1, total }) : ""}
            className="h-full w-full object-cover"
            loading={eager && i === 0 ? "eager" : "lazy"}
            fetchPriority={eager && i === 0 ? "high" : undefined}
            decoding="async"
            draggable={false}
          />
          {i === 3 && total > 4 && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-xl font-bold text-white">
              +{total - 4}
            </span>
          )}
        </div>
      ))}
      {children}
    </div>
  );
}

/** 投稿のグッズの札（写真 + 名前）。公式のグッズはそのページへ、持ち主だけのグッズはその場でひらく */
function GoodsChip({ goods, ownerId }: { goods: FeedGoods; ownerId: string }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => (goods.officialItemId ? navigate(`/item/${goods.officialItemId}`) : setOpen(true))}
        aria-label={t("social.itemPosts.openGoods", { title: goods.title })}
        className="mt-2 flex max-w-full items-center gap-2 rounded-xl border border-border/70 py-1 pl-1 pr-3 text-left transition-colors hover:bg-muted/60"
      >
        <span className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-muted">
          {goods.image && (
            <img
              src={getOptimizedImageUrl(goods.image, { width: 96 })}
              onError={fallbackToOriginal(goods.image)}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          )}
        </span>
        <span className="min-w-0 truncate text-xs font-medium">{goods.title}</span>
      </button>
      {open && goods.userItemId && (
        <PublicUserItemModal
          isOpen
          onClose={() => setOpen(false)}
          itemId={goods.userItemId}
          title={goods.title}
          image={goods.image ?? ""}
          ownerId={ownerId}
        />
      )}
    </>
  );
}

/** 本文（4 行で畳み、「もっと見る」で全文）。#タグ はフィードの絞り込みに */
function Caption({
  caption,
  onTagClick,
  onOpen,
}: {
  caption: string;
  onTagClick?: (tag: string) => void;
  /** 渡すと、本文（ボタン以外）のタップで詳細をひらく */
  onOpen?: () => void;
}) {
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
    <div
      className={cn("mt-0.5 text-sm leading-relaxed", onOpen && "cursor-pointer")}
      onClick={
        onOpen
          ? (e) => {
              if ((e.target as HTMLElement).closest("button, a")) return;
              // 文字を選んでいるときはひらかない
              if (window.getSelection()?.toString()) return;
              onOpen();
            }
          : undefined
      }
      data-testid={onOpen ? "text-post-body" : undefined}
    >
      <p ref={ref} className={cn("whitespace-pre-wrap break-words", !expanded && "line-clamp-4")}>
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
        <button type="button" onClick={() => setExpanded(true)} className="text-sm text-primary hover:underline">
          {t("social.itemPosts.readMore")}
        </button>
      )}
    </div>
  );
}

/**
 * 返信の入力。ふだんは 1 行、さわると広がり、文字があるときだけ「返信」ボタンが出る（X と同じ）。
 * ゲストにはログインへの案内を、入力欄と同じ見た目で出す（詳細と同じく、ゲストは書けない）。
 */
function InlineReply({ postId, inputRef }: { postId: string; inputRef: React.RefObject<HTMLTextAreaElement> }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const createComment = useCreateItemPostComment();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`)}
        className="my-1.5 block w-full rounded-full bg-muted/60 px-3.5 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {t("social.itemPosts.loginToCommentCta")}
      </button>
    );
  }

  const sending = createComment.isPending;
  const hasText = !!value.trim();
  const expanded = focused || hasText;
  const submit = async () => {
    if (!hasText || sending) return;
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
      className={cn(
        "my-1.5 flex items-end gap-2 bg-muted/60 px-3.5 transition-[border-radius] focus-within:bg-muted",
        expanded ? "rounded-2xl py-2" : "rounded-full py-1"
      )}
    >
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          // Enter で送る（Shift+Enter は改行。変換中の Enter は送らない）
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void submit();
          }
        }}
        rows={expanded ? 3 : 1}
        placeholder={t("social.itemPosts.replyPlaceholder")}
        aria-label={t("social.itemPosts.addComment")}
        maxLength={500}
        disabled={sending}
        enterKeyHint="send"
        className="min-w-0 flex-1 resize-none bg-transparent py-0.5 text-base leading-6 outline-none placeholder:text-muted-foreground sm:text-sm"
      />
      {hasText && (
        <button
          type="submit"
          disabled={sending}
          aria-label={t("social.itemPosts.sendComment")}
          className="flex h-7 shrink-0 items-center rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground transition-opacity disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("social.itemPosts.reply")}
        </button>
      )}
    </form>
  );
}

/** 次のページを読んでいるあいだの 1 行 */
export function FeedPostCardSkeleton() {
  return (
    <div className="flex gap-3 border-b border-border/70 px-4 py-3" aria-hidden="true">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="flex justify-between pr-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-8" />
          ))}
        </div>
      </div>
    </div>
  );
}
