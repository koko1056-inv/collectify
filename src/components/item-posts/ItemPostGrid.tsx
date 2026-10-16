import { motion } from "framer-motion";
import { Heart, MessageCircle, Images, PackageCheck } from "lucide-react";
import { ItemPost } from "@/hooks/item-posts/useItemPosts";
import { cn } from "@/lib/utils";
import { fallbackToOriginal, getAvatarImageUrl, getOptimizedImageUrl } from "@/utils/optimized-image";
import { useLanguage } from "@/contexts/LanguageContext";
import { EmptyState } from "@/components/ui/empty-state";
import type { PostReactionSummary } from "@/hooks/item-posts/useItemPostReactions";

interface ItemPostGridProps {
  posts: ItemPost[];
  onPostClick: (post: ItemPost) => void;
  /** 反応（持ってる/ほしい/尊い）の件数を出したいときに渡す */
  getReactions?: (postId: string) => PostReactionSummary;
  /** 0件のときに出すもの（並び・絞り込みに合わせた「次の一手」）。省略時は「まだ投稿はありません」 */
  empty?: React.ReactNode;
}

export function ItemPostGrid({ posts, onPostClick, getReactions, empty }: ItemPostGridProps) {
  const { t } = useLanguage();

  if (posts.length === 0) {
    if (empty) return <>{empty}</>;
    return (
      <EmptyState
        icon={Images}
        title={t("social.itemPosts.noPosts")}
        description={t("social.itemPosts.beFirst")}
        className="py-10"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {posts.map((post, idx) => (
        <ItemPostTile
          key={post.id}
          post={post}
          onClick={() => onPostClick(post)}
          delayIndex={idx}
          reactions={getReactions?.(post.id)}
        />
      ))}
    </div>
  );
}

function ItemPostTile({
  post,
  onClick,
  delayIndex,
  reactions,
}: {
  post: ItemPost;
  onClick: () => void;
  delayIndex: number;
  reactions?: PostReactionSummary;
}) {
  const cover = post.images[0]?.image_url;
  const hasMultiple = post.images.length > 1;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(delayIndex * 0.03, 0.3) }}
      onClick={onClick}
      className={cn(
        "relative aspect-square rounded-xl overflow-hidden group",
        "bg-muted shadow-sm hover:shadow-lg transition-all hover:scale-[1.02]"
      )}
    >
      {cover ? (
        // 投稿の写真の元画像は 1〜2MB の PNG が多い（1画面18枚で 25MB を読んでいた）。
        // マスは スマホ 2列（約190px）なので、高密度の画面でも 600px あれば足りる
        <img
          src={getOptimizedImageUrl(cover, { width: 600 })}
          onError={fallbackToOriginal(cover)}
          alt=""
          className="w-full h-full object-cover"
          loading={delayIndex < 4 ? "eager" : "lazy"}
          fetchPriority={delayIndex < 4 ? "high" : undefined}
          decoding="async"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10" />
      )}

      {/* 複数枚バッジ */}
      {hasMultiple && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-sm">
          <Images className="w-3.5 h-3.5" />
        </div>
      )}

      {/* 投稿者アバター */}
      {post.profile?.avatar_url && (
        <div className="absolute top-2 left-2 w-7 h-7 rounded-full overflow-hidden ring-2 ring-white/80 shadow-md">
          <img
            src={getAvatarImageUrl(post.profile.avatar_url, 96)}
            onError={fallbackToOriginal(post.profile.avatar_url)}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      )}

      {/* 下部オーバーレイ: いいね・コメント数 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-2">
        <div className="flex items-center gap-2.5 text-white text-xs font-medium">
          <div className="flex items-center gap-1">
            <Heart
              className={cn(
                "w-3.5 h-3.5",
                post.is_liked_by_me && "fill-primary text-primary"
              )}
            />
            {post.like_count}
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" />
            {post.comment_count}
          </div>
          {reactions && reactions.counts.have > 0 && (
            <div className="flex items-center gap-1">
              <PackageCheck className="w-3.5 h-3.5" />
              {reactions.counts.have}
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}
