import { useState, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { cn } from "@/lib/utils";
import { Flame, Sparkles, Users, Camera } from "lucide-react";
import { useItemPostsFeed, FeedMode } from "@/hooks/item-posts/useItemPostsFeed";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ItemPostGrid } from "@/components/item-posts/ItemPostGrid";
import { ItemPostDetailModal } from "@/components/item-posts/ItemPostDetailModal";
import { ItemPost, PostTarget } from "@/hooks/item-posts/useItemPosts";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { SelectItemForPostModal } from "@/components/item-posts/SelectItemForPostModal";
import { CreateItemPostModal } from "@/components/item-posts/CreateItemPostModal";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

// label は翻訳キー。モジュールスコープでは useLanguage が使えないため、描画時に t() で解決する。
const MODES: { id: FeedMode; label: string; icon: typeof Flame }[] = [
  { id: "new", label: "screens.itemPostsFeed.modeNew", icon: Sparkles },
  { id: "popular", label: "screens.itemPostsFeed.modePopular", icon: Flame },
  { id: "following", label: "screens.itemPostsFeed.modeFollowing", icon: Users },
];

export default function ItemPostsFeed() {
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
  const [createCtx, setCreateCtx] = useState<{
    target: PostTarget;
    title: string;
    image: string | null;
  } | null>(null);

  const { data: posts = [], isLoading } = useItemPostsFeed({
    mode,
    hashtag,
    contentFilter,
  });

  // グリッドから開いた投稿が優先。無ければ共有リンクの postId を使う。
  const activePostId = selectedPost?.id ?? routePostId ?? null;

  // コンテンツ名一覧
  const { data: contentNames = [] } = useQuery({
    queryKey: ["content-names-feed"],
    queryFn: async () => {
      const { data } = await supabase
        .from("content_names")
        .select("id, name")
        .order("name");
      return (data || []) as { id: string; name: string }[];
    },
  });

  const activeContentPill = useMemo(
    () => contentNames.find((c) => c.name === contentFilter)?.name ?? contentFilter,
    [contentNames, contentFilter]
  );

  const setContent = (name: string | null) => {
    const np = new URLSearchParams(searchParams);
    if (name) np.set("content", name);
    else np.delete("content");
    setSearchParams(np, { replace: true });
  };

  const clearHashtag = () => {
    const np = new URLSearchParams(searchParams);
    np.delete("tag");
    setSearchParams(np, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <main className="container mx-auto px-4 pt-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* タイトル */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <h1 className="text-2xl font-bold">{t("screens.itemPostsFeed.title")}</h1>
              {posts.length > 0 && (
                <span className="text-sm text-muted-foreground">{t("screens.itemPostsFeed.countSuffix", { count: posts.length })}</span>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (!user) {
                  toast.error(t("screens.itemPostsFeed.loginRequired"));
                  return;
                }
                setPickerOpen(true);
              }}
              className="gap-1.5 rounded-full h-9"
            >
              <Camera className="w-4 h-4" />
              {t("screens.itemPostsFeed.createPost")}
            </Button>
          </div>

          {/* モードセグメント */}
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
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">{t(m.label)}</span>
                </button>
              );
            })}
          </div>

          {/* コンテンツフィルタ */}
          <div className="flex flex-wrap gap-1.5">
            <FilterPill
              active={!contentFilter}
              onClick={() => setContent(null)}
            >
              {t("screens.itemPostsFeed.allFilter")}
            </FilterPill>
            {contentNames.slice(0, 12).map((c) => (
              <FilterPill
                key={c.id}
                active={activeContentPill === c.name}
                onClick={() => setContent(c.name)}
              >
                {c.name}
              </FilterPill>
            ))}
          </div>

          {/* ハッシュタグ表示 */}
          {hashtag && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-sm font-medium text-primary">#{hashtag}</span>
              <button
                onClick={clearHashtag}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              >
                {t("screens.itemPostsFeed.clearTag")}
              </button>
            </div>
          )}

          {/* 投稿グリッド */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : (
            <ItemPostGrid posts={posts} onPostClick={setSelectedPost} />
          )}
        </div>
      </main>

      {/* 共有リンク(/post/:postId)で来た場合も、その投稿を直接開く */}
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
        onSelect={(target, title, image) =>
          setCreateCtx({ target, title, image })
        }
      />

      {createCtx && (
        <CreateItemPostModal
          open={!!createCtx}
          onOpenChange={(o) => !o && setCreateCtx(null)}
          target={createCtx.target}
          itemTitle={createCtx.title}
          itemImage={createCtx.image}
        />
      )}

      <Footer />
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
