
import { usePosts } from "@/hooks/posts";
import { PostCard } from "./PostCard";
import { useState, useMemo } from "react";
import { CommentsModal } from "./CommentsModal";

interface PostsGridProps {
  filters?: {
    selectedTags: string[];
    selectedContent: string;
    searchQuery: string;
  };
}

export function PostsGrid({ filters }: PostsGridProps) {
  const { data: posts, isLoading, error } = usePosts();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // フィルタリングされた投稿
  const filteredPosts = useMemo(() => {
    if (!posts) return posts;

    let filtered = posts;

    // キーワード検索
    if (filters?.searchQuery?.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter((post) => {
        const titleMatch = post.user_items?.title?.toLowerCase().includes(query);
        const captionMatch = post.caption?.toLowerCase().includes(query);
        const usernameMatch = post.profiles?.username?.toLowerCase().includes(query);
        return titleMatch || captionMatch || usernameMatch;
      });
    }

    // 作品で絞り込み
    if (filters?.selectedContent) {
      filtered = filtered.filter((post) => 
        post.user_items?.content_name === filters.selectedContent
      );
    }

    // タグで絞り込み（投稿に関連するユーザーアイテムのタグをチェック）
    if (filters?.selectedTags && filters.selectedTags.length > 0) {
      filtered = filtered.filter((post) => {
        // TODO: ユーザーアイテムのタグ情報を取得して絞り込み
        // 現在は投稿データにタグ情報がないため、この機能は後で実装
        return true;
      });
    }

    return filtered;
  }, [posts, filters]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    console.error("投稿の取得に失敗:", error);
    return (
      <div className="text-center py-12">
        <p className="text-destructive">投稿の読み込みに失敗しました</p>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">まだ投稿がありません</p>
      </div>
    );
  }

  if (!filteredPosts || filteredPosts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">検索条件に一致する投稿が見つかりません</p>
        <p className="text-sm text-muted-foreground mt-2">
          別のキーワードで検索してみてください
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-border">
        {filteredPosts.map((post) => (
          <div key={post.id} className="hover:bg-muted/30 transition-colors">
            <PostCard
              post={post}
              onCommentClick={() => setSelectedPostId(post.id)}
            />
          </div>
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
