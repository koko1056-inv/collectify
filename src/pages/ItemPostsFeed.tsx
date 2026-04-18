import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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

const MODES: { id: FeedMode; label: string; icon: typeof Flame }[] = [
  { id: "new", label: "新着", icon: Sparkles },
  { id: "popular", label: "人気", icon: Flame },
  { id: "following", label: "フォロー中", icon: Users },
];

export default function ItemPostsFeed() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<FeedMode>("new");
  const hashtag = searchParams.get("tag");
  const contentFilter = searchParams.get("content");
  const [selectedPost, setSelectedPost] = useState<ItemPost | null>(null);

  const { data: posts = [], isLoading } = useItemPostsFeed({
    mode,
    hashtag,
    contentFilter,
  });

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
      <main className="container mx-auto px-4 pt-20">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* タイトル */}
          <div className="flex items-baseline justify-between">
            <h1 className="text-2xl font-bold">みんなの投稿</h1>
            {posts.length > 0 && (
              <span className="text-sm text-muted-foreground">{posts.length}件</span>
            )}
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
                  <span className="text-xs sm:text-sm">{m.label}</span>
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
              すべて
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
                解除
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

      <ItemPostDetailModal
        open={!!selectedPost}
        onOpenChange={(o) => !o && setSelectedPost(null)}
        postId={selectedPost?.id ?? null}
        initialPost={selectedPost}
      />

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
