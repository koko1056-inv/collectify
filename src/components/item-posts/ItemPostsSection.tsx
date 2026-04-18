import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Images } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  PostTarget,
  useItemPosts,
  ItemPost,
} from "@/hooks/item-posts/useItemPosts";
import { CreateItemPostModal } from "./CreateItemPostModal";
import { ItemPostGrid } from "./ItemPostGrid";
import { ItemPostDetailModal } from "./ItemPostDetailModal";

interface ItemPostsSectionProps {
  target: PostTarget;
  itemTitle: string;
  itemImage?: string | null;
}

/**
 * グッズ詳細画面に埋め込む「みんなの投稿」セクション。
 * - 投稿グリッド + 「投稿する」CTA
 * - タップで詳細モーダル
 */
export function ItemPostsSection({
  target,
  itemTitle,
  itemImage,
}: ItemPostsSectionProps) {
  const { user } = useAuth();
  const { data: posts = [], isLoading } = useItemPosts(target);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ItemPost | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Images className="w-4 h-4 text-primary" />
          みんなの投稿
          {posts.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">
              ({posts.length})
            </span>
          )}
        </h3>
        {user && (
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="gap-1.5 rounded-full h-8"
          >
            <Camera className="w-3.5 h-3.5" />
            投稿する
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <ItemPostGrid posts={posts} onPostClick={setSelectedPost} />
      )}

      <CreateItemPostModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        target={target}
        itemTitle={itemTitle}
        itemImage={itemImage}
      />

      <ItemPostDetailModal
        open={!!selectedPost}
        onOpenChange={(o) => !o && setSelectedPost(null)}
        postId={selectedPost?.id ?? null}
        initialPost={selectedPost}
      />
    </div>
  );
}
