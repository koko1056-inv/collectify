
import { useState } from "react";
import { useItemPosts } from "@/hooks/useItemPosts";
import { PostCard } from "@/components/posts/PostCard";
import { CommentsModal } from "@/components/posts/CommentsModal";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ItemPostsSectionProps {
  userItemId: string;
}

export function ItemPostsSection({ userItemId }: ItemPostsSectionProps) {
  const { data: posts, isLoading } = useItemPosts(userItemId);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">このアイテムの投稿</h3>
        <div className="text-center py-4">
          <div className="text-sm text-gray-500">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">このアイテムの投稿</h3>
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">まだ投稿がありません</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <h3 className="text-sm font-medium">このアイテムの投稿 ({posts.length}件)</h3>
        <ScrollArea className="h-64">
          <div className="space-y-3 pr-2">
            {posts.map((post) => (
              <div key={post.id} className="transform scale-90 origin-left">
                <PostCard
                  post={post}
                  onCommentClick={() => setSelectedPostId(post.id)}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {selectedPostId && (
        <CommentsModal
          postId={selectedPostId}
          isOpen={!!selectedPostId}
          onClose={() => setSelectedPostId(null)}
        />
      )}
    </>
  );
}
