
import { useState } from "react";
import { useItemPosts } from "@/hooks/useItemPosts";
import { PostDetailModal } from "@/components/posts/PostDetailModal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GoodsPost } from "@/types/posts";
import { useLanguage } from "@/contexts/LanguageContext";

interface ItemPostsSectionProps {
  userItemId: string;
}

export function ItemPostsSection({ userItemId }: ItemPostsSectionProps) {
  const { data: posts, isLoading } = useItemPosts(userItemId);
  const [selectedPost, setSelectedPost] = useState<GoodsPost | null>(null);
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">{t("itemDetails.posts.title")}</h3>
        <div className="text-center py-4">
          <div className="text-sm text-gray-500">{t("itemDetails.common.loading")}</div>
        </div>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">{t("itemDetails.posts.title")}</h3>
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">{t("itemDetails.posts.empty")}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <h3 className="text-sm font-medium">{t("itemDetails.posts.title")} ({posts.length}{t("itemDetails.posts.countSuffix")})</h3>
        <ScrollArea className="h-64">
          <div className="space-y-3 pr-2">
            {posts.map((post) => (
              <div 
                key={post.id} 
                className="cursor-pointer border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                onClick={() => setSelectedPost(post)}
              >
                <img
                  src={post.image_url}
                  alt={post.caption || t("itemDetails.posts.imageAlt")}
                  className="w-full h-32 object-cover"
                />
                <div className="p-2">
                  <p className="text-xs text-muted-foreground line-clamp-2">{post.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <PostDetailModal
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
      />
    </>
  );
}
