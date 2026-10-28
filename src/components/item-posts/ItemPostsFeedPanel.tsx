import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Camera, Flame, Images, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Pocke } from "@/components/pocke/Pocke";
import { OshiDiscoveryPanel } from "@/components/releases/OshiDiscoveryPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useItemPostsFeedPages, type FeedMode } from "@/hooks/item-posts/useItemPostsFeed";
import type { ItemPost, PostTarget } from "@/hooks/item-posts/useItemPosts";
import { shareContent } from "@/utils/share";
import { SITE_URL } from "@/config/site";
import { FeedPostCard, FeedPostCardSkeleton } from "./FeedPostCard";
import { ItemPostDetailModal } from "./ItemPostDetailModal";
import { SelectItemForPostModal } from "./SelectItemForPostModal";
import { CreateItemPostModal } from "./CreateItemPostModal";
import { WeeklyPromptBanner } from "./WeeklyPromptBanner";
import { RecentRegistrationsStrip } from "./RecentRegistrationsStrip";

// label は翻訳キー。モジュールスコープでは useLanguage が使えないため、描画時に t() で解決する。
const MODES: { id: FeedMode; label: string; icon: typeof Flame }[] = [
  { id: "new", label: "screens.itemPostsFeed.modeNew", icon: Sparkles },
  { id: "popular", label: "screens.itemPostsFeed.modePopular", icon: Flame },
  { id: "following", label: "screens.itemPostsFeed.modeFollowing", icon: Users },
];

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
      <div className="flex items-center justify-between gap-3">
        {/* 件数は出さない（タイムラインは下へ読み足していくので、読み込んだ数しか分からない） */}
        <h2 className="text-lg font-bold">{t("screens.itemPostsFeed.title")}</h2>
        <Button size="sm" onClick={() => startPost(null)} className="gap-1.5 rounded-full h-9">
          <Camera className="w-4 h-4" />
          {t("screens.itemPostsFeed.createPost")}
        </Button>
      </div>

      <WeeklyPromptBanner
        onPost={(tag) => startPost(tag)}
        onBrowse={(tag) => patchParams((p) => p.set("tag", tag))}
      />

      <RecentRegistrationsStrip />

      <div className="relative flex p-1 rounded-full bg-muted/60 border border-border/30 max-w-md">
        {MODES.map((m) => {
          const isActive = mode === m.id;
          const disabled = m.id === "following" && !user;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => !disabled && setMode(m.id)}
              disabled={disabled}
              className={cn(
                "relative flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-sm font-medium transition-colors z-10 disabled:opacity-40 disabled:cursor-not-allowed",
                isActive ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs sm:text-sm">{t(m.label)}</span>
            </button>
          );
        })}
      </div>

      {/* 作品の札は折り返さず1行で横にスクロール（以前は3〜4行に折り返し、投稿が押し下げられていた） */}
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>button]:shrink-0">
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
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium text-primary">#{hashtag}</span>
          <button
            onClick={() => patchParams((p) => p.delete("tag"))}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            {t("screens.itemPostsFeed.clearTag")}
          </button>
        </div>
      )}

      {/* SNS 風のタイムライン: 1 列のカード。写真をひらかなくても、いいね・コメントが見られて書ける */}
      {isLoading ? (
        <div className="mx-auto max-w-lg space-y-4">
          <p role="status" aria-live="polite" className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Pocke pose="think" height={40} motion="bob" />
            {t("social.itemPosts.feedLoading")}
          </p>
          <FeedPostCardSkeleton />
          <FeedPostCardSkeleton />
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
        <div className="mx-auto max-w-lg space-y-4">
          {posts.map((post, i) => (
            <FeedPostCard
              key={post.id}
              post={post}
              eager={i < 2}
              onOpen={setSelectedPost}
              onTagClick={(tag) => {
                patchParams((p) => p.set("tag", tag));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          ))}
          {isFetchingNextPage && (
            <>
              <p role="status" aria-live="polite" className="text-center text-xs text-muted-foreground">
                {t("social.itemPosts.feedLoadingMore")}
              </p>
              <FeedPostCardSkeleton />
            </>
          )}
          {hasNextPage ? (
            <div ref={sentinel} className="flex justify-center py-2">
              {!isFetchingNextPage && (
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => void fetchNextPage()}>
                  {t("social.itemPosts.feedLoadMore")}
                </Button>
              )}
            </div>
          ) : (
            posts.length >= 3 && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
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
      className={cn(
        "px-3 py-1.5 rounded-full border text-xs transition-all",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-foreground border-border hover:border-primary/40"
      )}
    >
      {children}
    </button>
  );
}
