import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Camera, Link2, Lock, Users } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { BackButton } from "@/components/navigation/BackButton";
import { PockeSays } from "@/components/pocke/Pocke";
import { pockeCheer } from "@/components/pocke/pockeCheer";
import { FeedPostCard, FeedPostCardSkeleton } from "@/components/item-posts/FeedPostCard";
import { ItemPostDetailModal } from "@/components/item-posts/ItemPostDetailModal";
import { SelectItemForPostModal } from "@/components/item-posts/SelectItemForPostModal";
import { CreateItemPostModal } from "@/components/item-posts/CreateItemPostModal";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import { usePostEvent, usePostEventStats } from "@/hooks/usePostEvents";
import { useItemPostsFeedPages } from "@/hooks/item-posts/useItemPostsFeed";
import { useItemPostReactions } from "@/hooks/item-posts/useItemPostReactions";
import type { ItemPost, PostTarget } from "@/hooks/item-posts/useItemPosts";
import { SITE_URL } from "@/config/site";
import { cn } from "@/lib/utils";
import { daysLeft, eventColor, eventPhase } from "@/types/postEvents";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * お題イベントのページ（/event/:id）。ログインしていなくても見られる（共有されたリンクから来る人向け）。
 * 上から: 表紙（絵文字・色・期間・残り日数・参加人数）→ ポッケの一言 → 参加する / Xでシェア → みんなの投稿（タイムラインのカード）。
 * スマホでは「このお題で投稿する」を画面の下に貼りつけておく。
 */
export default function EventPage() {
  const { id = "" } = useParams<{ id: string }>();
  const validId = UUID.test(id);
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatShortDate } = useDateFormat();
  const eventQ = usePostEvent(validId ? id : null);
  const event = eventQ.data ?? null;
  const stats = usePostEventStats(event ? [event.id] : []);
  const s = event ? stats.data?.get(event.id) : undefined;

  const feed = useItemPostsFeedPages({ mode: "new", eventId: event?.id ?? (validId ? id : null) });
  const posts = useMemo(() => feed.data?.pages.flatMap((p) => p.posts) ?? [], [feed.data]);
  const reactions = useItemPostReactions(posts.map((p) => p.id), { keepPrevious: true });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feed;

  const [selectedPost, setSelectedPost] = useState<ItemPost | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createCtx, setCreateCtx] = useState<{ target: PostTarget | null; title: string; image: string | null } | null>(null);

  const sentinel = useRef<HTMLDivElement>(null);
  // 上の「このお題で投稿する」が画面から外れたら、下に貼りつくボタンを出す（同じボタンが2つ並ばないように）
  const ctaRef = useRef<HTMLDivElement>(null);
  const [ctaHidden, setCtaHidden] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
    }, { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const hasEvent = !!event;
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setCtaHidden(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [hasEvent]);

  useEffect(() => {
    if (!event) return;
    const prev = document.title;
    document.title = `#${event.hashtag} | Collectify`;
    return () => {
      document.title = prev;
    };
  }, [event]);

  const phase = event ? eventPhase(event) : null;
  const open = phase === "open";
  const color = event ? eventColor(event) : undefined;
  const left = event ? daysLeft(event) : 0;
  const pageUrl = `${SITE_URL}/event/${id}`;

  const join = () => {
    if (!event || !open) return;
    if (!user) {
      toast.info(t("postEvents.loginToJoin"));
      navigate(`/login?redirect=${encodeURIComponent(`/event/${event.id}`)}`);
      return;
    }
    setPickerOpen(true);
  };

  const shareX = () => {
    if (!event) return;
    const text = t("postEvents.shareText", { tag: event.hashtag });
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}&hashtags=${encodeURIComponent(event.hashtag)}`;
    window.open(url, "_blank", "noopener");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      toast.success(t("postEvents.copied"));
    } catch {
      toast.error(t("engage.share.copyFailed"));
    }
  };

  const notFound = !validId || (eventQ.isSuccess && !event);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 pb-nav sm:pb-10">
        <div className="mx-auto max-w-xl px-4 pt-3 sm:pt-6">
          <BackButton fallbackTo="/explore?tab=posts" className="-ml-2" />
        </div>

        {notFound ? (
          <div className="mx-auto max-w-xl space-y-4 px-4">
            <EmptyState pose="think" title={t("postEvents.notFoundTitle")} description={t("postEvents.notFoundDesc")} />
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => navigate("/explore?tab=posts")}>
                {t("postEvents.backToPosts")}
              </Button>
            </div>
          </div>
        ) : eventQ.isError ? (
          <QueryErrorState title={t("system.loadFailed")} onRetry={() => void eventQ.refetch()} />
        ) : !event ? (
          <div className="mx-auto max-w-xl space-y-3 px-4" aria-busy="true">
            <Skeleton className="h-52 w-full rounded-3xl" />
            <Skeleton className="h-12 w-2/3 rounded-2xl" />
            <Skeleton className="h-11 w-full rounded-full" />
          </div>
        ) : (
          <>
            {/* 表紙 */}
            <section className="mx-auto max-w-xl px-4 animate-fade-in">
              <div
                className="relative overflow-hidden rounded-3xl border p-5 sm:p-6"
                style={{
                  borderColor: `${color}40`,
                  background: `radial-gradient(120% 90% at 100% 0%, ${color}38 0%, transparent 60%), linear-gradient(160deg, ${color}1f 0%, ${color}08 100%)`,
                }}
                data-testid="event-hero"
              >
                {event.cover_image_url && (
                  <img
                    src={event.cover_image_url}
                    alt=""
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
                    loading="eager"
                  />
                )}
                <span aria-hidden="true" className="pointer-events-none absolute -right-6 -top-8 select-none leading-none opacity-[0.14]" style={{ fontSize: 150 }}>
                  {event.emoji}
                </span>
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-1.5 text-2xs font-bold">
                    <span className="rounded-full px-2 py-0.5 text-white" style={{ backgroundColor: color }}>
                      {t("postEvents.label")}
                    </span>
                    <PhasePill phase={phase!} left={left} startsOn={formatShortDate(event.starts_at)} color={color!} />
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-background text-4xl"
                      style={{ boxShadow: `0 8px 24px -10px ${color}` }}
                    >
                      {event.emoji || "#"}
                    </span>
                    <div className="min-w-0">
                      <h1 className="text-xl font-bold leading-tight sm:text-2xl">{event.title}</h1>
                      <p className="mt-0.5 truncate text-sm font-bold" style={{ color }}>
                        #{event.hashtag}
                      </p>
                    </div>
                  </div>
                  {event.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{event.description}</p>}
                  <dl className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <dt className="sr-only">period</dt>
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      <dd>{t("postEvents.period", { start: formatShortDate(event.starts_at), end: formatShortDate(new Date(new Date(event.ends_at).getTime() - 1)) })}</dd>
                    </div>
                    <div className="flex items-center gap-1">
                      <dt className="sr-only">participants</dt>
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      <dd className="font-bold text-foreground" data-testid="event-participants">
                        {(s?.participantCount ?? 0) > 0
                          ? t(phase === "ended" ? "postEvents.participantsEnded" : "postEvents.participants", { n: s!.participantCount })
                          : t("postEvents.firstOne")}
                      </dd>
                    </div>
                    {event.suggested_category && (
                      <div className="flex items-center gap-1">
                        <dt className="sr-only">category</dt>
                        <dd className="rounded-full bg-background/70 px-2 py-0.5">{t("postEvents.suggested", { category: event.suggested_category })}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              <PockeSays pose={phase === "ended" ? "wink" : phase === "upcoming" ? "think" : "cheer"} height={72} className="mt-4" bubbleClassName="text-sm">
                {phase === "ended"
                  ? t("postEvents.pockeEnded")
                  : phase === "upcoming"
                    ? t("postEvents.pockeUpcoming")
                    : event.pocke_line || t("postEvents.pockeDefault", { tag: event.hashtag })}
              </PockeSays>

              {/* 参加・シェア（PC・タブレット。スマホは下に貼りつけたボタンも出す） */}
              <div ref={ctaRef} className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
                <Button
                  onClick={join}
                  disabled={!open}
                  className="h-11 gap-1.5 rounded-full text-sm font-bold text-white shadow-md hover:brightness-110"
                  style={open ? { backgroundColor: color, boxShadow: `0 8px 20px -10px ${color}` } : undefined}
                  data-testid="event-join"
                >
                  {open ? <Camera className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {open ? t("postEvents.joinCta") : phase === "upcoming" ? t("postEvents.upcoming") : t("postEvents.ended")}
                </Button>
                <Button variant="outline" onClick={shareX} className="h-11 gap-1.5 rounded-full px-4" aria-label={t("postEvents.shareX")}>
                  <XLogo className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t("postEvents.shareX")}</span>
                </Button>
                <Button variant="outline" size="icon" onClick={copyLink} className="h-11 w-11 rounded-full" aria-label={t("postEvents.copyLink")}>
                  <Link2 className="h-4 w-4" />
                </Button>
              </div>
              {phase === "ended" && <p className="mt-2 text-center text-2xs text-muted-foreground">{t("postEvents.endedNote")}</p>}
              {phase === "upcoming" && (
                <p className="mt-2 text-center text-2xs text-muted-foreground">{t("postEvents.upcomingNote", { date: formatShortDate(event.starts_at) })}</p>
              )}
            </section>

            {/* みんなの投稿 */}
            <section className="mx-auto mt-6 max-w-xl sm:border-x sm:border-border/70">
              <h2 className="flex items-center justify-between border-b border-t border-border/70 px-4 py-3 text-sm font-bold">
                {t("postEvents.feedTitle")}
                {(s?.postCount ?? 0) > 0 && <span className="text-2xs font-medium text-muted-foreground">{t("postEvents.posts", { n: s!.postCount })}</span>}
              </h2>
              {feed.isLoading ? (
                <>
                  <FeedPostCardSkeleton />
                  <FeedPostCardSkeleton />
                </>
              ) : feed.isError && posts.length === 0 ? (
                <QueryErrorState title={t("social.itemPosts.feedFailed")} onRetry={() => void feed.refetch()} />
              ) : posts.length === 0 && !hasNextPage ? (
                <EmptyState
                  pose={open ? "point" : "sleepy"}
                  className="py-10"
                  title={open ? t("postEvents.emptyTitle") : t("postEvents.emptyEnded")}
                  description={open ? t("postEvents.emptyDesc") : undefined}
                  action={
                    open ? (
                      <Button onClick={join} className="gap-1.5 rounded-full text-white" style={{ backgroundColor: color }}>
                        <Camera className="h-4 w-4" />
                        {t("postEvents.joinCta")}
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <>
                  {posts.map((post, i) => (
                    <FeedPostCard
                      key={post.id}
                      post={post}
                      eager={i < 2}
                      onOpen={(p) => (user ? setSelectedPost(p) : pockeCheer("likeGuest"))}
                      reactions={reactions.data?.get(post.id)}
                      onTagClick={(tag) => navigate(`/explore?tab=posts&tag=${encodeURIComponent(tag)}`)}
                    />
                  ))}
                  {isFetchingNextPage && <FeedPostCardSkeleton />}
                  {hasNextPage && (
                    <div ref={sentinel} className="flex justify-center py-4">
                      {!isFetchingNextPage && (
                        <Button variant="outline" size="sm" className="rounded-full" onClick={() => void fetchNextPage()}>
                          {t("social.itemPosts.feedLoadMore")}
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* スマホ: 下に貼りつく参加ボタン（下のタブの上） */}
            {open && ctaHidden && (
              <div className="fixed inset-x-0 animate-fade-in bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-border/60 bg-background/90 px-4 py-2.5 backdrop-blur-xl sm:hidden">
                <Button
                  onClick={join}
                  className="h-11 w-full gap-1.5 rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  <Camera className="h-4 w-4" />
                  {t("postEvents.joinCta")}
                </Button>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />

      {event && (
        <>
          <ItemPostDetailModal
            open={!!selectedPost}
            onOpenChange={(o) => !o && setSelectedPost(null)}
            postId={selectedPost?.id ?? null}
            initialPost={selectedPost}
          />
          <SelectItemForPostModal
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            title={t("postEvents.composer.pickTitle")}
            preferKeyword={event.suggested_category}
            onSelect={(target, title, image) => setCreateCtx({ target, title, image })}
            onSkip={() => setCreateCtx({ target: null, title: "", image: null })}
          />
          {createCtx && (
            <CreateItemPostModal
              open
              onOpenChange={(o) => !o && setCreateCtx(null)}
              target={createCtx.target}
              itemTitle={createCtx.title}
              itemImage={createCtx.image}
              initialTag={event.hashtag}
              event={event}
              onCreated={() => toast.success(t("engage.posts.postedTitle"))}
            />
          )}
        </>
      )}
    </div>
  );
}

function PhasePill({ phase, left, startsOn, color }: { phase: ReturnType<typeof eventPhase>; left: number; startsOn: string; color: string }) {
  const { t } = useLanguage();
  const text =
    phase === "open"
      ? left > 0
        ? t("postEvents.daysLeft", { n: left })
        : t("postEvents.lastDay")
      : phase === "upcoming"
        ? t("postEvents.startsOn", { date: startsOn })
        : phase === "draft"
          ? t("postEvents.draft")
          : t("postEvents.ended");
  return (
    <span
      className={cn("rounded-full border bg-background/80 px-2 py-0.5", phase === "ended" && "text-muted-foreground")}
      style={phase === "open" ? { color, borderColor: `${color}55` } : undefined}
    >
      {text}
    </span>
  );
}

/** X のロゴ（lucide に無いので、同じ太さの線に合う塗りの形で描く） */
function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
