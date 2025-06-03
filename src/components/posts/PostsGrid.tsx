
import { usePosts } from "@/hooks/usePosts";
import { PostCard } from "./PostCard";
import { useState } from "react";
import { CommentsModal } from "./CommentsModal";

export function PostsGrid() {
  const { data: posts, isLoading, error } = usePosts();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    console.error("投稿の取得に失敗:", error);
    return (
      <div className="text-center py-12">
        <p className="text-red-500">投稿の読み込みに失敗しました</p>
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
