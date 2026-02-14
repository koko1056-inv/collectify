import { GoodsPost } from "@/types/posts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToggleLike } from "@/hooks/posts";
import { useState, memo } from "react";
import { CommentsModal } from "./CommentsModal";
import { LazyImage } from "@/components/ui/lazy-image";
import { useLanguage } from "@/contexts/LanguageContext";

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
    await toggleLike.mutateAsync({ postId: post.id, isLiked });
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCommentsModalOpen(true);
  };

  return (
    <>
      <div 
        className="group cursor-pointer break-inside-avoid mb-3"
        onClick={onClick}
      >
        <div className="relative overflow-hidden rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
          {/* 画像 */}
          <LazyImage
            src={post.image_url}
            alt={post.caption || t("posts.postImage")}
            className="w-full h-auto object-cover"
            skeletonClassName="aspect-square"
          />
          
          {/* デスクトップ: ホバーオーバーレイ */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden lg:flex flex-col justify-end p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7 border-2 border-white/80">
                  <AvatarImage src={post.profiles?.avatar_url} />
                  <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                    {post.profiles?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white text-sm font-medium drop-shadow-sm">
                  {post.profiles?.username}
                </span>
              </div>
              <div className="flex items-center gap-3 text-white">
                <button onClick={handleLike} disabled={!user} className="flex items-center gap-1 hover:scale-110 transition-transform">
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-400 text-red-400' : ''}`} />
                  <span className="text-xs">{likesCount}</span>
                </button>
                <button onClick={handleCommentClick} className="flex items-center gap-1 hover:scale-110 transition-transform">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-xs">{commentsCount}</span>
                </button>
              </div>
            </div>
            {post.caption && (
              <p className="text-white/90 text-xs mt-1.5 line-clamp-2 drop-shadow-sm">{post.caption}</p>
            )}
          </div>

          {/* モバイル: 下部情報 */}
          <div className="p-2.5 space-y-1.5 lg:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={post.profiles?.avatar_url} />
                  <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">
                    {post.profiles?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] font-medium text-card-foreground truncate max-w-[80px]">
                  {post.profiles?.username}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleLike} disabled={!user} className="flex items-center gap-0.5">
                  <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                  <span className="text-[10px] text-muted-foreground">{likesCount}</span>
                </button>
                <button onClick={handleCommentClick} className="flex items-center gap-0.5">
                  <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{commentsCount}</span>
                </button>
              </div>
            </div>
            {post.caption && (
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{post.caption}</p>
            )}
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
