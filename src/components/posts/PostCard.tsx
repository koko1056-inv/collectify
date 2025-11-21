import { GoodsPost } from "@/types/posts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToggleLike } from "@/hooks/posts";
import { useState } from "react";
import { CommentsModal } from "./CommentsModal";

interface PostCardProps {
  post: GoodsPost;
  onClick: () => void;
}

export function PostCard({ post, onClick }: PostCardProps) {
  const { user } = useAuth();
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
          {/* 画像 */}
          <img
            src={post.image_url}
            alt={post.caption || "投稿画像"}
            className="w-full h-auto object-cover"
          />
          
          {/* ホバー時のオーバーレイ */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
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
}
