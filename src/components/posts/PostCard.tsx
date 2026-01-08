import { GoodsPost } from "@/types/posts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToggleLike } from "@/hooks/posts";
import { useState, memo } from "react";
import { CommentsModal } from "./CommentsModal";
import { LazyImage } from "@/components/ui/lazy-image";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";

interface PostCardProps {
  post: GoodsPost;
  onClick: () => void;
}

export const PostCard = memo(function PostCard({ post, onClick }: PostCardProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const toggleLike = useToggleLike();
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);

  const isLiked = post.post_likes?.some(like => like.user_id === user?.id) || false;
  const likesCount = post.post_likes?.length || 0;
  const commentsCount = post.post_comments?.length || 0;

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    
    await toggleLike.mutateAsync({
      postId: post.id,
      isLiked,
    });
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCommentsModalOpen(true);
  };

  return (
    <>
      <div 
        className="group cursor-pointer break-inside-avoid mb-2"
        onClick={onClick}
      >
        <div className="relative overflow-hidden rounded-lg bg-background border hover:shadow-lg transition-all duration-300">
          <LazyImage
            src={post.image_url}
            alt={post.caption || t("posts.postImage")}
            className="w-full h-auto object-cover"
            skeletonClassName="aspect-square"
          />
          
          {/* モバイル用: 常時表示のユーザー情報とアクション */}
          <div className="p-2 space-y-2 lg:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={post.profiles?.avatar_url} />
                  <AvatarFallback className="text-[10px]">
                    {post.profiles?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium truncate max-w-[80px]">
                  {post.profiles?.username}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLike}
                  className="flex items-center gap-1 text-xs"
                  disabled={!user}
                >
                  <Heart 
                    className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
                  />
                  <span className="text-muted-foreground">{likesCount}</span>
                </button>
                <button
                  onClick={handleCommentClick}
                  className="flex items-center gap-1 text-xs"
                >
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{commentsCount}</span>
                </button>
              </div>
            </div>
            {/* グッズ情報 */}
            {post.user_items && (
              <div className="flex items-center gap-2 p-1.5 bg-muted/50 rounded">
                {post.user_items.image && (
                  <img 
                    src={post.user_items.image} 
                    alt={post.user_items.title || ""} 
                    className="w-6 h-6 rounded object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium truncate">
                    {post.user_items.title}
                  </p>
                  {post.user_items.content_name && (
                    <p className="text-[9px] text-muted-foreground truncate">
                      {post.user_items.content_name}
                    </p>
                  )}
                </div>
                <Package className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              </div>
            )}
            {post.caption && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {post.caption}
              </p>
            )}
            {/* タグ表示 */}
            {post.user_items?.user_item_tags && post.user_items.user_item_tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {post.user_items.user_item_tags.slice(0, 3).map((tagItem, index) => (
                  tagItem.tags && (
                    <Badge 
                      key={tagItem.tags.id || index} 
                      variant="secondary" 
                      className="text-[9px] px-1.5 py-0"
                    >
                      #{tagItem.tags.name}
                    </Badge>
                  )
                ))}
                {post.user_items.user_item_tags.length > 3 && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                    +{post.user_items.user_item_tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          {/* デスクトップ用: ホバー時のオーバーレイ */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-col justify-between p-3 hidden lg:flex">
            {/* トップエリア：アクションボタン */}
            <div className="flex justify-end gap-2">
              <button
                onClick={handleLike}
                className="p-2 rounded-full bg-white/90 hover:bg-white transition-colors backdrop-blur-sm"
                disabled={!user}
              >
                <Heart 
                  className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-700'}`}
                />
              </button>
              <button
                onClick={handleCommentClick}
                className="p-2 rounded-full bg-white/90 hover:bg-white transition-colors backdrop-blur-sm"
              >
                <MessageCircle className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* ボトムエリア：ユーザー情報と統計 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white text-sm">
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  <span>{likesCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>{commentsCount}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 border-2 border-white">
                  <AvatarImage src={post.profiles?.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {post.profiles?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-white text-sm font-medium">{post.profiles?.username}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CommentsModal
        isOpen={isCommentsModalOpen}
        onClose={() => setIsCommentsModalOpen(false)}
        postId={post.id}
      />
    </>
  );
});
