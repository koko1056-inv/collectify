import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, Images, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import { ItemPost, PostTarget, useItemPosts } from "@/hooks/item-posts/useItemPosts";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";
import { CreateItemPostModal } from "./CreateItemPostModal";
import { ItemPostDetailModal } from "./ItemPostDetailModal";
import { ItemPostGrid } from "./ItemPostGrid";

interface UserItemPostsSectionProps {
  /** user_items.id */
  userItemId: string;
  /** グッズの持ち主。この人の投稿だけを出す */
  ownerId: string | null | undefined;
  /** 見ているのが持ち主本人か。本人なら「投稿する」と、以前の思い出を出す */
  isOwner: boolean;
  itemTitle: string;
  itemImage?: string | null;
}

interface LegacyMemory {
  id: string;
  image_url: string | null;
  comment: string | null;
  created_at: string;
}

/**
 * グッズ詳細の「このグッズの投稿」。
 *
 * 以前は「思い出」（item_memories）と「投稿」（item_posts）が別々にあり、どちらに書けばよいか迷わせていた。
 * 書く先は投稿に一本化し、ここでは持ち主がこのグッズについて書いた投稿を並べる。
 * 他の人のグッズでは、その人の公開投稿だけを見せる（投稿はもともと公開のもの）。
 *
 * 以前の思い出は投稿へ移していない。投稿には公開範囲がなくフィードにも流れるため、
 * 本人向けに書いた思い出を移すと勝手に公開することになるから。また思い出の多くは文字だけで、
 * 写真が前提の投稿の見た目に合わない。そこで本人にだけ、読み取り専用で投稿の下に並べる。
 */
export function UserItemPostsSection({
  userItemId,
  ownerId,
  isOwner,
  itemTitle,
  itemImage,
}: UserItemPostsSectionProps) {
  const { t } = useLanguage();
  const { formatDate } = useDateFormat();
  const target: PostTarget = { type: "user_item", id: userItemId };
  const { data: posts = [], isLoading } = useItemPosts(ownerId ? target : null, 20, ownerId);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ItemPost | null>(null);

  const { data: memories = [] } = useQuery({
    queryKey: ["item-memories", userItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_memories")
        .select("id, image_url, comment, created_at")
        .eq("user_item_id", userItemId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LegacyMemory[];
    },
    enabled: isOwner && !!userItemId,
    staleTime: 5 * 60 * 1000,
  });

  // 他の人のグッズで投稿がないときは、空の見出しを出さない
  if (!isOwner && !isLoading && posts.length === 0) return null;

  return (
    <section data-item-posts-section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold">
          <Images className="h-4 w-4 text-primary" />
          {t("itemDetails.posts.title")}
          {posts.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground tabular-nums">({posts.length})</span>
          )}
        </h3>
        {isOwner && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 gap-1.5 rounded-full">
            <Camera className="h-3.5 w-3.5" />
            {t("social.itemPosts.postCta")}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : posts.length > 0 ? (
        <ItemPostGrid posts={posts} onPostClick={setSelectedPost} />
      ) : (
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-border px-4 py-5 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
        >
          <Camera className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{t("itemDetails.posts.ownEmpty")}</span>
          <span className="text-xs text-muted-foreground">{t("itemDetails.posts.ownEmptyHint")}</span>
        </button>
      )}

      {isOwner && memories.length > 0 && (
        <div className="space-y-2 rounded-xl bg-muted/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-foreground">
              {t("itemDetails.posts.legacyMemoriesTitle", { count: memories.length })}
            </span>
            <span className="flex items-center gap-1 text-2xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              {t("itemDetails.posts.legacyMemoriesPrivate")}
            </span>
          </div>
          <ul className="space-y-2">
            {memories.map((m) => (
              <li key={m.id} className="flex gap-2 rounded-lg bg-background/70 p-2">
                {m.image_url && (
                  <img
                    src={getOptimizedImageUrl(m.image_url, { width: 160 })}
                    onError={fallbackToOriginal(m.image_url)}
                    loading="lazy"
                    decoding="async"
                    alt={t("itemDetails.posts.legacyMemoryImageAlt")}
                    className="h-14 w-14 shrink-0 rounded-md bg-muted object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  {m.comment && (
                    <p className="whitespace-pre-wrap break-words text-xs text-foreground">{m.comment}</p>
                  )}
                  <p className="mt-0.5 text-3xs text-muted-foreground">{formatDate(m.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isOwner && (
        <CreateItemPostModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          target={target}
          itemTitle={itemTitle}
          itemImage={itemImage}
        />
      )}

      <ItemPostDetailModal
        open={!!selectedPost}
        onOpenChange={(o) => !o && setSelectedPost(null)}
        postId={selectedPost?.id ?? null}
        initialPost={selectedPost}
      />
    </section>
  );
}
