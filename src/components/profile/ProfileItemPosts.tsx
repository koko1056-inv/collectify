import { useState } from "react";
import { Camera, Images } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserItemPosts, ItemPost } from "@/hooks/item-posts/useItemPosts";
import { ItemPostDetailModal } from "@/components/item-posts/ItemPostDetailModal";
import { ItemPostGrid } from "@/components/item-posts/ItemPostGrid";

interface ProfileItemPostsProps {
  userId: string;
}

/**
 * プロフィール画面に表示する「自分の投稿」セクション。
 */
export function ProfileItemPosts({ userId }: ProfileItemPostsProps) {
  const { user } = useAuth();
  const { data: posts = [], isLoading } = useUserItemPosts(userId);
  const [selectedPost, setSelectedPost] = useState<ItemPost | null>(null);

  const isOwnProfile = user?.id === userId;

  if (!isLoading && posts.length === 0 && !isOwnProfile) {
    return null; // 他人プロフィールで投稿0件なら非表示
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-primary" />
          投稿
          {posts.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">
              ({posts.length})
            </span>
          )}
        </h3>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-2">
            <Images className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            {isOwnProfile
              ? "まだ投稿がありません\n好きなグッズから投稿してみましょう"
              : "まだ投稿がありません"}
          </p>
        </div>
      ) : (
        <ItemPostGrid posts={posts} onPostClick={setSelectedPost} />
      )}

      <ItemPostDetailModal
        open={!!selectedPost}
        onOpenChange={(o) => !o && setSelectedPost(null)}
        postId={selectedPost?.id ?? null}
        initialPost={selectedPost}
      />
    </div>
  );
}
