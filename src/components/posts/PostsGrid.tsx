
import { usePosts } from "@/hooks/usePosts";
import { PostCard } from "./PostCard";
import { useState, useEffect } from "react";
import { CommentsModal } from "./CommentsModal";

export function PostsGrid() {
  const { data: posts, isLoading, refetch } = usePosts();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // ページ表示時に最新の投稿を取得
  useEffect(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">まだ投稿がありません</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onCommentClick={() => setSelectedPostId(post.id)}
          />
        ))}
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
