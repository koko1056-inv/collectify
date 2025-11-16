import { usePostsWithPagination } from "@/hooks/posts/usePostsWithPagination";
import { PostCard } from "./PostCard";
import { useState, useMemo, useRef, useEffect } from "react";
import { CommentsModal } from "./CommentsModal";

interface PostsGridProps {
  filters?: {
    selectedTags: string[];
    selectedContent: string;
    searchQuery: string;
  };
}

export function PostsGrid({ filters }: PostsGridProps) {
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = usePostsWithPagination();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // 無限スクロールの実装
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 全ページの投稿をフラット化
  const posts = useMemo(() => {
    return data?.pages.flatMap(page => page.posts) || [];
  }, [data]);

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

    // タグで絞り込み
    if (filters?.selectedTags && filters.selectedTags.length > 0) {
      filtered = filtered.filter((post) => {
        if (!post.user_items?.user_item_tags) return false;
        const itemTags = post.user_items.user_item_tags.map(ut => ut.tags?.name).filter(Boolean);
        return filters.selectedTags.some(selectedTag => itemTags.includes(selectedTag));
      });
    }

    return filtered;
  }, [posts, filters]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-background rounded-lg border p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-skeleton-base rounded-full animate-pulse" />
              <div className="flex-1">
                <div className="h-4 bg-skeleton-base rounded animate-pulse mb-1" />
                <div className="h-3 bg-skeleton-base rounded animate-pulse w-2/3" />
              </div>
            </div>
            <div className="h-48 bg-skeleton-base rounded animate-pulse mb-3" />
            <div className="h-4 bg-skeleton-base rounded animate-pulse mb-2" />
            <div className="h-3 bg-skeleton-base rounded animate-pulse w-3/4" />
          </div>
        ))}
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

      {/* 無限スクロールのトリガー要素 */}
      <div ref={observerTarget} className="h-4" />

      {/* 次のページを読み込み中 */}
      {isFetchingNextPage && (
        <div className="space-y-4 mt-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-background rounded-lg border p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-skeleton rounded-full animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 bg-skeleton rounded animate-pulse mb-1" />
                  <div className="h-3 bg-skeleton rounded animate-pulse w-2/3" />
                </div>
              </div>
              <div className="h-48 bg-skeleton rounded animate-pulse mb-3" />
            </div>
          ))}
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
