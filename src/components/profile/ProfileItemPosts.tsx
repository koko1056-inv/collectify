import { useState } from "react";
import { Camera, Images } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserItemPosts, ItemPost } from "@/hooks/item-posts/useItemPosts";
import { ItemPostDetailModal } from "@/components/item-posts/ItemPostDetailModal";
import { ItemPostGrid } from "@/components/item-posts/ItemPostGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();

  const isOwnProfile = user?.id === userId;

  if (!isLoading && posts.length === 0 && !isOwnProfile) {
    return null; // 他人プロフィールで投稿0件なら非表示
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-primary" />
          {t("profileScreen.posts.title")}
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
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Images}
          title={
            isOwnProfile
              ? t("profileScreen.posts.emptyOwn")
              : t("profileScreen.posts.empty")
          }
        />
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
