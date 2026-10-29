import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeftRight,
  Feather,
  Heart,
  MapPin,
  MessagesSquare,
  PackageOpen,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Pocke } from "@/components/pocke/Pocke";
import { FeedPostCard, FeedPostCardSkeleton } from "@/components/item-posts/FeedPostCard";
import { ItemPostDetailModal } from "@/components/item-posts/ItemPostDetailModal";
import { CreateItemPostModal } from "@/components/item-posts/CreateItemPostModal";
import { useGoodsPostsPages } from "@/hooks/item-posts/useItemPostsFeed";
import { useItemPostReactions } from "@/hooks/item-posts/useItemPostReactions";
import type { ItemPost } from "@/hooks/item-posts/useItemPosts";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

/** 話題のチップ。押すと、いつもの投稿画面がこのグッズ付き・書き出しの文入りでひらく */
const TOPICS: {
  id: "unboxed" | "whereBought" | "display" | "trade" | "love";
  icon: LucideIcon;
}[] = [
  { id: "unboxed", icon: PackageOpen },
  { id: "whereBought", icon: MapPin },
  { id: "display", icon: Sparkles },
  { id: "trade", icon: ArrowLeftRight },
  { id: "love", icon: Heart },
];

interface GoodsTopicSectionProps {
  itemId: string;
  itemTitle: string;
  itemImage?: string | null;
  className?: string;
  /** 1 ページの件数（モーダルの中では少なめに） */
  pageSize?: number;
  /** 見出しの大きさ。ページでは h2、モーダルの中では h3 */
  headingLevel?: "h2" | "h3";
}

/**
 * グッズのページの「このグッズの話題」。
 * このグッズに結びついた投稿（公式グッズへの投稿 + 持ち物からの投稿）を、投稿タブと同じ X 風のカードで新しい順に並べる。
 * 上の話題のチップから、いつもの投稿画面（CreateItemPostModal）をこのグッズ付きでひらく。
 */
export function GoodsTopicSection({
  itemId,
  itemTitle,
  itemImage,
  className,
  pageSize = 5,
  headingLevel: Heading = "h2",
}: GoodsTopicSectionProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const feed = useGoodsPostsPages(itemId, { pageSize });
  const posts = useMemo(() => feed.data?.pages.flatMap((p) => p.posts) ?? [], [feed.data]);
  const reactions = useItemPostReactions(
    posts.map((p) => p.id),
    { keepPrevious: true },
  );
  const [selected, setSelected] = useState<ItemPost | null>(null);
  // 投稿画面は開くたびに作り直す（チップごとに書き出しが違うので、前の下書きを残さない）
  const [compose, setCompose] = useState<{ key: number; text: string } | null>(null);
  const loginHref = `/login?redirect=${encodeURIComponent(pathname)}`;

  const startPost = (text: string) => setCompose({ key: Date.now(), text });

  return (
    <section className={cn("space-y-3", className)} aria-labelledby={`goods-topic-${itemId}`} data-testid="goods-topic">
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <Heading id={`goods-topic-${itemId}`} className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <MessagesSquare className="h-4 w-4 text-primary" aria-hidden="true" />
            {t("goodsSocial.topic.title")}
          </Heading>
          <p className="mt-0.5 text-2xs text-muted-foreground">{t("goodsSocial.topic.subtitle")}</p>
        </div>
        {user ? (
          <Button size="sm" className="h-8 shrink-0 gap-1.5 rounded-full" onClick={() => startPost("")}>
            <Feather className="h-3.5 w-3.5" aria-hidden="true" />
            {t("goodsSocial.topic.post")}
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="h-8 shrink-0 rounded-full" asChild>
            <Link to={loginHref}>{t("goodsSocial.topic.guestPost")}</Link>
          </Button>
        )}
      </div>

      {/* 話題のチップ。狭い画面では横にスクロール（折り返して高さが変わらないように） */}
      <div
        role="group"
        aria-label={t("goodsSocial.topic.chipsLabel")}
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {TOPICS.map(({ id, icon: Icon }) =>
          user ? (
            <button
              key={id}
              type="button"
              onClick={() => startPost(t(`goodsSocial.topic.chipText.${id}`))}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 active:scale-[0.97] motion-reduce:transform-none"
            >
              <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {t(`goodsSocial.topic.chips.${id}`)}
            </button>
          ) : (
            <Link
              key={id}
              to={loginHref}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground hover:border-primary/40"
            >
              <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {t(`goodsSocial.topic.chips.${id}`)}
            </Link>
          ),
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {feed.isLoading ? (
          <div aria-hidden="true">
            <FeedPostCardSkeleton />
            <FeedPostCardSkeleton />
          </div>
        ) : feed.isError && posts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <Pocke pose="sad" height={56} />
            <p className="text-xs text-muted-foreground">{t("goodsSocial.topic.loadFailed")}</p>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => void feed.refetch()}>
              {t("goodsSocial.people.retry")}
            </Button>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center" data-testid="goods-topic-empty">
            <Pocke pose="point" height={72} motion="pop" loading="lazy" />
            <p className="text-sm font-bold">{t("goodsSocial.topic.emptyTitle")}</p>
            <p className="max-w-xs text-xs text-muted-foreground">{t("goodsSocial.topic.emptyBody")}</p>
            {user ? (
              <Button
                size="sm"
                className="mt-1 gap-1.5 rounded-full"
                onClick={() => startPost(t("goodsSocial.topic.chipText.unboxed"))}
              >
                <Feather className="h-3.5 w-3.5" aria-hidden="true" />
                {t("goodsSocial.topic.post")}
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="mt-1 rounded-full" asChild>
                <Link to={loginHref}>{t("goodsSocial.topic.guestPost")}</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* カードの最後の線は枠と重なるので消す */}
            <div className="[&>article:last-child]:border-b-0">
              {posts.map((post, i) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  eager={i < 1}
                  onOpen={setSelected}
                  reactions={reactions.data?.get(post.id)}
                />
              ))}
            </div>
            {feed.isFetchingNextPage && (
              <>
                <p role="status" aria-live="polite" className="sr-only">
                  {t("goodsSocial.topic.loadingMore")}
                </p>
                <div className="border-t border-border/70">
                  <FeedPostCardSkeleton />
                </div>
              </>
            )}
            {feed.hasNextPage && !feed.isFetchingNextPage ? (
              <div className="flex justify-center border-t border-border/70 py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-primary"
                  onClick={() => void feed.fetchNextPage()}
                >
                  {t("goodsSocial.topic.loadMore")}
                </Button>
              </div>
            ) : (
              !feed.hasNextPage &&
              posts.length >= pageSize && (
                <p className="flex items-center justify-center gap-1.5 border-t border-border/70 py-3 text-xs text-muted-foreground">
                  <Pocke pose="wink" height={28} loading="lazy" />
                  {t("goodsSocial.topic.end")}
                </p>
              )
            )}
          </>
        )}
      </div>

      <ItemPostDetailModal
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        postId={selected?.id ?? null}
        initialPost={selected}
      />

      {compose && (
        <CreateItemPostModal
          key={compose.key}
          open
          onOpenChange={(o) => !o && setCompose(null)}
          target={{ type: "official", id: itemId }}
          itemTitle={itemTitle}
          itemImage={itemImage}
          initialText={compose.text}
        />
      )}
    </section>
  );
}
