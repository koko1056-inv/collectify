import { GoodsPost } from "@/types/posts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PostCardProps {
  post: GoodsPost;
  onClick: () => void;
}

export function PostCard({ post, onClick }: PostCardProps) {
  return (
    <div 
      className="group cursor-pointer break-inside-avoid mb-4"
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
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
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
  );
}
