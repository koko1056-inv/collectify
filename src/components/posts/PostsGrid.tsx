import { usePostsWithPagination } from "@/hooks/posts/usePostsWithPagination";
import { PostCard } from "./PostCard";
import { useState, useMemo, useRef, useEffect } from "react";
import { PostDetailModal } from "./PostDetailModal";
import { GoodsPost } from "@/types/posts";
import { useIsMobile } from "@/hooks/use-mobile";

interface PostsGridProps {
  filters?: {
    selectedTags: string[];
    selectedContent: string;
    searchQuery: string;
  };
}

export function PostsGrid({ filters }: PostsGridProps) {
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = usePostsWithPagination();
  const [selectedPost, setSelectedPost] = useState<GoodsPost | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

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
      <div 
        className="w-full"
        style={{
          columnCount: isMobile ? 2 : 4,
          columnGap: '8px',
        }}
      >
        {[...Array(6)].map((_, i) => (
          <div key={i} className="break-inside-avoid mb-2">
            <div className="rounded-lg border overflow-hidden">
              <div className="w-full h-64 bg-skeleton-base animate-pulse" />
            </div>
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
        <p className="text-muted-foreground">
          {filters?.searchQuery || filters?.selectedContent || filters?.selectedTags?.length
            ? "条件に一致する投稿が見つかりませんでした"
            : "まだ投稿がありません"}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* 2列固定のマソンリーレイアウト */}
      <div 
        className="w-full"
        style={{
          columnCount: isMobile ? 2 : 4,
          columnGap: '8px',
        }}
      >
        {filteredPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onClick={() => setSelectedPost(post)}
          />
        ))}
      </div>
      
      {/* 無限スクロールのトリガー */}
      <div ref={observerTarget} className="h-20" />
      
      {/* 次のページを読み込み中 */}
      {isFetchingNextPage && (
        <div 
          className="w-full mt-4"
          style={{
            columnCount: isMobile ? 2 : 4,
            columnGap: '8px',
          }}
        >
          {[...Array(4)].map((_, i) => (
            <div key={i} className="break-inside-avoid mb-2">
              <div className="rounded-lg border overflow-hidden">
                <div className="w-full h-64 bg-skeleton-base animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      <PostDetailModal
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
      />
    </>
  );
}
