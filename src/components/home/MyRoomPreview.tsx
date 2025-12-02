import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Home, 
  Heart, 
  Eye, 
  Pencil, 
  Plus, 
  Sparkles,
  Users
} from "lucide-react";
import { useMyRoom, RoomItem } from "@/hooks/useMyRoom";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/types";
import { cn } from "@/lib/utils";

interface MyRoomPreviewProps {
  profile: Profile | undefined;
  onEditRoom: () => void;
}

export function MyRoomPreview({ profile, onEditRoom }: MyRoomPreviewProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    mainRoom, 
    roomItems, 
    likeCount, 
    isLiked, 
    isLoading, 
    createMainRoom,
    toggleLike,
    isOwnRoom
  } = useMyRoom();

  const [isHovered, setIsHovered] = useState(false);

  // ルームがない場合の作成画面
  if (!isLoading && !mainRoom && user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center relative px-4 sm:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 rounded-3xl" />
        
        <div className="relative z-10 text-center space-y-6 max-w-md">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
            <Home className="w-16 h-16 text-primary/60" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">マイルームを作ろう！</h2>
            <p className="text-muted-foreground">
              自分だけの推し部屋を作って、グッズを飾りましょう
            </p>
          </div>

          <Button 
            size="lg" 
            onClick={() => createMainRoom.mutate("マイルーム")}
            disabled={createMainRoom.isPending}
            className="gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="w-5 h-5" />
            マイルームを作成
          </Button>
        </div>
      </div>
    );
  }

  // ローディング
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center relative px-4 sm:px-8">
      {/* 背景のグラデーション */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 rounded-3xl" />
      
      {/* ルームプレビュー */}
      <div 
        className="relative w-full max-w-2xl aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl cursor-pointer group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onEditRoom}
        style={{
          backgroundColor: mainRoom?.background_color || '#f8f9fa',
          backgroundImage: mainRoom?.background_image ? `url(${mainRoom.background_image})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* グリッド背景（デフォルト） */}
        {!mainRoom?.background_image && (
          <div className="absolute inset-0 opacity-10">
            <div 
              className="w-full h-full"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #000 1px, transparent 1px),
                  linear-gradient(to bottom, #000 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px'
              }}
            />
          </div>
        )}

        {/* 配置されたアイテム */}
        {roomItems.map((item) => (
          <RoomItemDisplay key={item.id} item={item} />
        ))}

        {/* アバター表示（中央下部に配置） */}
        {profile?.avatar_url && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
            <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback>{profile.username?.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* アイテムがない場合のヒント */}
        {roomItems.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2 bg-white/80 backdrop-blur-sm p-6 rounded-xl">
              <Sparkles className="w-8 h-8 mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                クリックして部屋を編集
              </p>
            </div>
          </div>
        )}

        {/* ホバーオーバーレイ */}
        <div className={cn(
          "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          <Button variant="secondary" size="lg" className="gap-2 shadow-lg">
            <Pencil className="w-5 h-5" />
            部屋を編集
          </Button>
        </div>
      </div>

      {/* ルーム情報 */}
      <div className="relative z-10 mt-6 text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">
          {mainRoom?.title || "マイルーム"}
        </h2>

        {/* 統計情報 */}
        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Eye className="w-4 h-4" />
            <span className="text-sm">{mainRoom?.visit_count || 0} 訪問</span>
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (user && !isOwnRoom) {
                toggleLike.mutate();
              }
            }}
            className={cn(
              "flex items-center gap-2 transition-colors",
              isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
            )}
            disabled={!user || isOwnRoom}
          >
            <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
            <span className="text-sm">{likeCount} いいね</span>
          </button>
        </div>

        {/* アクションボタン */}
        <div className="flex items-center justify-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => navigate("/binder")}
          >
            <Users className="w-4 h-4" />
            他の部屋を見る
          </Button>
        </div>
      </div>
    </div>
  );
}

// ルームアイテム表示コンポーネント
function RoomItemDisplay({ item }: { item: RoomItem }) {
  const imageUrl = item.custom_image_url || item.item_data?.image;
  
  if (!imageUrl) return null;

  return (
    <div
      className="absolute transition-transform hover:scale-105"
      style={{
        left: `${item.position_x}%`,
        top: `${item.position_y}%`,
        width: `${item.width}px`,
        height: `${item.height}px`,
        transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
        zIndex: item.z_index,
      }}
    >
      <img
        src={imageUrl}
        alt={item.item_data?.title || "アイテム"}
        className="w-full h-full object-contain drop-shadow-lg"
        draggable={false}
      />
    </div>
  );
}
