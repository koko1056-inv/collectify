
import { usePosts } from "@/hooks/posts";
import { PostCard } from "./PostCard";
import { useState, useMemo } from "react";
import { CommentsModal } from "./CommentsModal";
import { PostsSearchBar } from "./PostsSearchBar";

export function PostsGrid() {
  const { data: posts, isLoading, error } = usePosts();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // 検索でフィルタリングされた投稿
  const filteredPosts = useMemo(() => {
    if (!posts || !searchQuery.trim()) {
      return posts;
    }

    return posts.filter((post) => {
      const titleMatch = post.user_items?.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const captionMatch = post.caption?.toLowerCase().includes(searchQuery.toLowerCase());
      const usernameMatch = post.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return titleMatch || captionMatch || usernameMatch;
    });
  }, [posts, searchQuery]);

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
      <div className="space-y-6">
        <PostsSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <div className="text-center py-12">
          <p className="text-gray-500">まだ投稿がありません</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PostsSearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {filteredPosts && filteredPosts.length > 0 ? (
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onCommentClick={() => setSelectedPostId(post.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">検索条件に一致する投稿が見つかりません</p>
          <p className="text-sm text-gray-400 mt-2">
            別のキーワードで検索してみてください
          </p>
        </div>
      )}

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
