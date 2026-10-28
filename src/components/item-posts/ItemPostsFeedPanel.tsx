import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Camera, ImagePlus, Images, LayoutGrid, Rows3, Users, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Pocke } from "@/components/pocke/Pocke";
import { OshiDiscoveryPanel } from "@/components/releases/OshiDiscoveryPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useItemPostsFeedPages, type FeedMode } from "@/hooks/item-posts/useItemPostsFeed";
import { useItemPostReactions } from "@/hooks/item-posts/useItemPostReactions";
import type { ItemPost, PostTarget } from "@/hooks/item-posts/useItemPosts";
import { shareContent } from "@/utils/share";
import { SITE_URL } from "@/config/site";
import { FeedPostCard, FeedPostCardSkeleton } from "./FeedPostCard";
import { ItemPostGrid } from "./ItemPostGrid";
import { ItemPostDetailModal } from "./ItemPostDetailModal";
import { SelectItemForPostModal } from "./SelectItemForPostModal";
import { CreateItemPostModal } from "./CreateItemPostModal";
import { WeeklyPromptBanner } from "./WeeklyPromptBanner";
import { RecentRegistrationsStrip } from "./RecentRegistrationsStrip";

// label は翻訳キー。モジュールスコープでは useLanguage が使えないため、描画時に t() で解決する。
const VIEWS: { id: FeedView; label: string; icon: typeof Rows3 }[] = [
  { id: "feed", label: "screens.itemPostsFeed.viewFeed", icon: Rows3 },
  { id: "grid", label: "screens.itemPostsFeed.viewGrid", icon: LayoutGrid },
];
const MODES: { id: FeedMode; label: string }[] = [
  { id: "new", label: "screens.itemPostsFeed.modeNew" },
  { id: "popular", label: "screens.itemPostsFeed.modePopular" },
  { id: "following", label: "screens.itemPostsFeed.modeFollowing" },
];

type FeedView = "feed" | "grid";
/** タイムラインの列。スマホは端から端まで、広い画面では真ん中に寄せて左右に線（X と同じ） */
const FEED_COLUMN = "mx-auto max-w-xl sm:border-x sm:border-border/70";
const VIEW_KEY = "collectify:item-posts-view";

// 表示（タイムライン / タイル）は端末に覚えておく。SSR やプライベートモードで localStorage が使えなくても落ちないように
function readView(): FeedView {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "feed";
  } catch {
    return "feed";
  }
}

function saveView(v: FeedView) {
  try {
    window.localStorage.setItem(VIEW_KEY, v);
  } catch {
    // 保存できなくても、この画面の中では切り替わっていれば十分
  }
}

/**
 * 投稿フィード一式（お題・新着登録・フィード・投稿作成）。
 * /item-posts の単独ページと、探索の「投稿」タブの両方で使う。
 */
export function ItemPostsFeedPanel() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  // /post/:postId で共有された投稿を開くためのパラメータ
  const { postId: routePostId } = useParams<{ postId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<FeedMode>("new");
  const [view, setViewState] = useState<FeedView>(readView);
  const setView = (v: FeedView) => {
    setViewState(v);
    saveView(v);
  };
  const hashtag = searchParams.get("tag");
  const contentFilter = searchParams.get("content");
  const [selectedPost, setSelectedPost] = useState<ItemPost | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingTag, setPendingTag] = useState<string | null>(null);
  const [createCtx, setCreateCtx] = useState<{
    target: PostTarget;
    title: string;
    image: string | null;
    tag: string | null;
  } | null>(null);

  const feed = useItemPostsFeedPages({ mode, hashtag, contentFilter });
  const posts = useMemo(() => feed.data?.pages.flatMap((pg) => pg.posts) ?? [], [feed.data]);
  const { isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = feed;
  // 持ってる・ほしいの数。読み込んだ投稿ぶんをまとめて 1 回で読む（タイムラインのボタン・タイルの「持ってる」の両方で使う）
  const reactions = useItemPostReactions(posts.map((p) => p.id), { keepPrevious: true });

  // 下まで来たら次を読む（「もっと見る」も残す: 読み上げ・キーボードでも進めるように）
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
    }, { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const activePostId = selectedPost?.id ?? routePostId ?? null;

  const { data: contentNames = [] } = useQuery({
    queryKey: ["content-names-feed"],
    queryFn: async () => {
      const { data } = await supabase.from("content_names").select("id, name").order("name");
      return (data || []) as { id: string; name: string }[];
    },
  });

  const activeContentPill = useMemo(
    () => contentNames.find((c) => c.name === contentFilter)?.name ?? contentFilter,
    [contentNames, contentFilter]
  );

  const patchParams = (fn: (p: URLSearchParams) => void) => {
    const np = new URLSearchParams(searchParams);
    fn(np);
    setSearchParams(np, { replace: true });
  };

  const startPost = (tag: string | null) => {
    if (!user) {
      toast.error(t("screens.itemPostsFeed.loginRequired"));
      return;
    }
    setPendingTag(tag);
    setPickerOpen(true);
  };

  // ?compose=<お題>: 「みんな」の上の「今週のお題 → 投稿する」から来たとき、その場で投稿を始める
  const composeParam = searchParams.get("compose");
  useEffect(() => {
    if (composeParam === null) return;
    patchParams((p) => p.delete("compose"));
    startPost(composeParam || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 合図（compose）が来たときだけ
  }, [composeParam]);

  const handleCreated = (postId: string) => {
    toast.success(t("engage.posts.postedTitle"), {
      description: t("engage.posts.postedDesc"),
      action: {
        label: t("engage.share.share"),
        onClick: () => {
          void shareContent({
            title: t("social.itemPosts.shareTitle"),
            text: t("engage.posts.shareMine"),
            url: `${SITE_URL}/post/${postId}`,
          });
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* 見出しは探索の上のバーと重なるので読み上げ用だけ。投稿するは右下の丸ボタン（X の「ポスト」と同じ場所） */}
      <h2 className="sr-only">{t("screens.itemPostsFeed.title")}</h2>

      <WeeklyPromptBanner
        onPost={(tag) => startPost(tag)}
        onBrowse={(tag) => patchParams((p) => p.set("tag", tag))}
      />

      <RecentRegistrationsStrip />

      {/* ここから下は画面の端から端まで（X のタイムラインのように、カードの枠ではなく線で区切る） */}
      <div className="-mx-4 pb-20 sm:mx-0 sm:pb-8">
        {/* 並びのタブと表示の切り替え。上のバー（探索のヘッダー）のすぐ下に貼りつく。高さは --app-sticky-top で受け取る */}
        <div
          className="sticky z-30 flex items-stretch border-b border-border/70 bg-background/80 backdrop-blur-xl"
          style={{ top: "var(--app-sticky-top, 0px)" }}
        >
          <div role="tablist" aria-label={t("screens.itemPostsFeed.sortLabel")} className="flex flex-1">
            {MODES.map((m) => {
              const isActive = mode === m.id;
              const disabled = m.id === "following" && !user;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => !disabled && setMode(m.id)}
                  disabled={disabled}
                  className={cn(
                    "relative flex h-12 flex-1 items-center justify-center text-sm transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
                    isActive ? "font-bold text-foreground" : "font-medium text-muted-foreground"
                  )}
                >
                  {t(m.label)}
                  {isActive && (
                    <span aria-hidden="true" className="absolute bottom-0 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 表示の切り替え（タイムライン / タイル） */}
          <div role="group" aria-label={t("screens.itemPostsFeed.viewToggle")} className="flex shrink-0 items-center gap-0.5 pl-1 pr-2">
            {VIEWS.map((v) => {
              const isActive = view === v.id;
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  aria-pressed={isActive}
                  aria-label={t(v.label)}
                  title={t(v.label)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </button>
              );
            })}
          </div>
        </div>

        {/* 作品の札は折り返さず1行で横にスクロール */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-border/70 px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>button]:shrink-0">
          <FilterPill active={!contentFilter} onClick={() => patchParams((p) => p.delete("content"))}>
            {t("screens.itemPostsFeed.allFilter")}
          </FilterPill>
          {contentNames.slice(0, 30).map((c) => (
            <FilterPill
              key={c.id}
              active={activeContentPill === c.name}
              onClick={() => patchParams((p) => p.set("content", c.name))}
            >
              {c.name}
            </FilterPill>
          ))}
        </div>

        {hashtag && (
          <div className="flex items-center gap-2 border-b border-border/70 px-4 py-2">
            <span className="min-w-0 truncate text-sm font-bold text-primary">#{hashtag}</span>
            <button
              type="button"
              onClick={() => patchParams((p) => p.delete("tag"))}
              className="ml-auto flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              {t("screens.itemPostsFeed.clearTag")}
            </button>
          </div>
        )}

        {/* タイムライン: 1 列の行。写真をひらかなくても、いいね・コメントが見られて書ける。
            タイル: 前の 2 列のマス。どちらも同じページ（同じ並び・絞り込み）を読むので、切り替えても取り直さない */}
        {isLoading ? (
          <div className={cn(view === "feed" ? FEED_COLUMN : "px-4 pt-3 sm:px-0")}>
            <p role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
              <Pocke pose="think" height={40} motion="bob" />
              {t("social.itemPosts.feedLoading")}
            </p>
            {view === "feed" ? (
              <>
                <FeedPostCardSkeleton />
                <FeedPostCardSkeleton />
              </>
            ) : (
              <GridSkeletonTiles count={6} />
            )}
          </div>
        ) : isError && posts.length === 0 ? (
          <QueryErrorState title={t("social.itemPosts.feedFailed")} onRetry={() => void feed.refetch()} />
        ) : posts.length === 0 && !hasNextPage ? (
          // 「まだありません」で終わらせず、並び・絞り込みに合わせた次の一手を出す
          mode === "following" ? (
            <EmptyState
              icon={Users}
              className="py-8"
              title={t("discover.empty.followingTitle")}
              description={t("discover.empty.followingDesc")}
              action={<Button variant="outline" onClick={() => navigate("/explore?tab=users")}>{t("discover.empty.findUsers")}</Button>}
            />
          ) : (
            <EmptyState
              icon={Images}
              className="py-8"
              title={hashtag || contentFilter ? t("discover.empty.postsFilteredTitle") : t("discover.empty.postsFirstTitle")}
              description={t("discover.empty.postsFirstDesc")}
              action={
                <Button onClick={() => startPost(hashtag)} className="gap-1.5">
                  <Camera className="h-4 w-4" />
                  {t("screens.itemPostsFeed.createPost")}
                </Button>
              }
            />
          )
        ) : (
          <div className={cn(view === "feed" ? FEED_COLUMN : "space-y-4 px-4 pt-3 sm:px-0")}>
            {view === "grid" ? (
              <ItemPostGrid
                posts={posts}
                onPostClick={setSelectedPost}
                getReactions={reactions.get}
                trailing={isFetchingNextPage && <SkeletonTiles count={4} />}
              />
            ) : posts.map((post, i) => (
              <FeedPostCard
                key={post.id}
                post={post}
                eager={i < 2}
                onOpen={setSelectedPost}
                reactions={reactions.data?.get(post.id)}
                onTagClick={(tag) => {
                  patchParams((p) => p.set("tag", tag));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            ))}
            {isFetchingNextPage && (
              <>
                <p role="status" aria-live="polite" className="py-3 text-center text-xs text-muted-foreground">
                  {t("social.itemPosts.feedLoadingMore")}
                </p>
                {view === "feed" && <FeedPostCardSkeleton />}
              </>
            )}
            {hasNextPage ? (
              <div ref={sentinel} className="flex justify-center py-4">
                {!isFetchingNextPage && (
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => void fetchNextPage()}>
                    {t("social.itemPosts.feedLoadMore")}
                  </Button>
                )}
              </div>
            ) : (
              posts.length >= 3 && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Pocke pose="wink" height={44} loading="lazy" />
                  {t("social.itemPosts.feedEnd")}
                </div>
              )
            )}
            {isError && (
              <QueryErrorState className="py-6" title={t("social.itemPosts.feedFailed")} onRetry={() => void fetchNextPage()} />
            )}
          </div>
        )}
      </div>

      {/* 投稿する（右下の丸ボタン）。スマホでは下のタブ（高さ 4rem + safe-area）の上に、真ん中の＋とは重ならない右端に置く */}
      <button
        type="button"
        onClick={() => startPost(null)}
        aria-label={t("screens.itemPostsFeed.createPost")}
        title={t("screens.itemPostsFeed.createPost")}
        className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:brightness-110 active:scale-95 motion-reduce:transition-none sm:bottom-8 sm:right-8"
      >
        <ImagePlus className="h-6 w-6" />
      </button>

      {/* 投稿がまだ少ない（3件未満）うちは、人の動きの代わりに推しの新着・発売予定・人気のグッズを出す */}
      {!isLoading && !hasNextPage && posts.length < 3 && (
        <OshiDiscoveryPanel
          className="border-t border-border pt-5"
          title={t("discover.panel.fillTitle")}
          description={t("discover.panel.fillDesc")}
        />
      )}

      <ItemPostDetailModal
        open={!!activePostId}
        onOpenChange={(o) => {
          if (o) return;
          setSelectedPost(null);
          // URL に postId が残ったままだと閉じても再度開いてしまうため、フィードへ戻す
          if (routePostId) navigate("/item-posts", { replace: true });
        }}
        postId={activePostId}
        initialPost={selectedPost}
      />

      <SelectItemForPostModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(target, title, image) => setCreateCtx({ target, title, image, tag: pendingTag })}
      />

      {createCtx && (
        <CreateItemPostModal
          open={!!createCtx}
          onOpenChange={(o) => !o && setCreateCtx(null)}
          target={createCtx.target}
          itemTitle={createCtx.title}
          itemImage={createCtx.image}
          initialTag={createCtx.tag}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

/** タイルの骨組み（ItemPostGrid のマスと同じ形） */
function SkeletonTiles({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-xl" />
      ))}
    </>
  );
}

function GridSkeletonTiles({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <SkeletonTiles count={count} />
    </div>
  );
}
