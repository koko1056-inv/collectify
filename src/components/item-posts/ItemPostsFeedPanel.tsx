import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Camera, Flame, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useItemPostsFeed, type FeedMode } from "@/hooks/item-posts/useItemPostsFeed";
import { useItemPostReactions } from "@/hooks/item-posts/useItemPostReactions";
import type { ItemPost, PostTarget } from "@/hooks/item-posts/useItemPosts";
import { shareContent } from "@/utils/share";
import { ItemPostGrid } from "./ItemPostGrid";
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

  const { data: posts = [], isLoading } = useItemPostsFeed({ mode, hashtag, contentFilter });
  const reactions = useItemPostReactions(posts.map((p) => p.id));

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

  const handleCreated = (postId: string) => {
    toast.success(t("engage.posts.postedTitle"), {
      description: t("engage.posts.postedDesc"),
      action: {
        label: t("engage.share.share"),
        onClick: () => {
          void shareContent({
            title: t("social.itemPosts.shareTitle"),
            text: t("engage.posts.shareMine"),
            url: `${window.location.origin}/post/${postId}`,
          });
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-bold">{t("screens.itemPostsFeed.title")}</h2>
          {posts.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {t("screens.itemPostsFeed.countSuffix", { count: posts.length })}
            </span>
          )}
        </div>
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

      <div className="flex flex-wrap gap-1.5">
        <FilterPill active={!contentFilter} onClick={() => patchParams((p) => p.delete("content"))}>
          {t("screens.itemPostsFeed.allFilter")}
        </FilterPill>
        {contentNames.slice(0, 12).map((c) => (
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

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : (
        <ItemPostGrid posts={posts} onPostClick={setSelectedPost} getReactions={reactions.get} />
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
