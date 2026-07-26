import { motion } from "framer-motion";
import { Heart, MessageCircle, Images } from "lucide-react";
import { ItemPost } from "@/hooks/item-posts/useItemPosts";
import { cn } from "@/lib/utils";

interface ItemPostGridProps {
  posts: ItemPost[];
  onPostClick: (post: ItemPost) => void;
}

export function ItemPostGrid({ posts, onPostClick }: ItemPostGridProps) {
  if (posts.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-3">
          <Images className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">
          まだ投稿がありません
        </p>
        <p className="text-xs text-muted-foreground">
          最初の投稿者になりませんか？
        </p>
      </div>
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
        />
      ))}
    </div>
  );
}

function ItemPostTile({
  post,
  onClick,
  delayIndex,
}: {
  post: ItemPost;
  onClick: () => void;
  delayIndex: number;
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
        <img
          src={cover}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
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
            src={post.profile.avatar_url}
            alt=""
            className="w-full h-full object-cover"
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
                post.is_liked_by_me && "fill-rose-400 text-rose-400"
              )}
            />
            {post.like_count}
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" />
            {post.comment_count}
          </div>
        </div>
      </div>
    </motion.button>
  );
}
