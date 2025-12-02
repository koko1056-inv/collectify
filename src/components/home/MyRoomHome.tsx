import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Home, 
  Heart, 
  Eye, 
  Pencil, 
  Plus, 
  Sparkles,
  Users,
  User,
  Shirt,
  Image
} from "lucide-react";
import { useMyRoom, RoomItem } from "@/hooks/useMyRoom";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/types";
import { cn } from "@/lib/utils";
import { AvatarGenerationModal } from "@/components/profile/AvatarGenerationModal";
import { AvatarDressUpModal } from "./avatar-center/AvatarDressUpModal";
import { AvatarGalleryModal } from "./avatar-center/AvatarGalleryModal";

interface MyRoomHomeProps {
  profile: Profile | undefined;
  onAvatarGenerated: (url: string) => void;
}

export function MyRoomHome({ profile, onAvatarGenerated }: MyRoomHomeProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"room" | "avatar">("room");
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showDressUp, setShowDressUp] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  
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

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-muted-foreground">プロフィールを読み込み中...</p>
      </div>
    );
  }

  const handleEditRoom = () => {
    if (mainRoom) {
      navigate(`/binder?edit=${mainRoom.id}`);
    }
  };

  // タブ切り替えによる表示
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center relative px-4 sm:px-8">
      {/* 背景のグラデーション */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 rounded-3xl" />
      
      {/* タブ切り替え */}
      <div className="relative z-10 mb-6 mt-16 sm:mt-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="room" className="gap-2">
              <Home className="w-4 h-4" />
              マイルーム
            </TabsTrigger>
            <TabsTrigger value="avatar" className="gap-2">
              <User className="w-4 h-4" />
              アバター
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === "room" ? (
        <RoomView 
          mainRoom={mainRoom}
          roomItems={roomItems}
          likeCount={likeCount}
          isLiked={isLiked}
          isLoading={isLoading}
          isOwnRoom={isOwnRoom}
          profile={profile}
          user={user}
          isHovered={isHovered}
          setIsHovered={setIsHovered}
          onEditRoom={handleEditRoom}
          onCreateRoom={() => createMainRoom.mutate("マイルーム")}
          onToggleLike={() => toggleLike.mutate()}
          createRoomPending={createMainRoom.isPending}
        />
      ) : (
        <AvatarView
          profile={profile}
          userId={user?.id}
          onShowAvatarModal={() => setShowAvatarModal(true)}
          onShowDressUp={() => setShowDressUp(true)}
          onShowGallery={() => setShowGallery(true)}
        />
      )}

      {/* コレクション・コレクターを見るリンク */}
      <div className="relative z-10 mt-6">
        <button 
          onClick={() => navigate("/search")}
          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          コレクション、コレクターを見る
        </button>
      </div>

      {/* モーダル */}
      {user?.id && (
        <>
          <AvatarGenerationModal
            isOpen={showAvatarModal}
            onClose={() => setShowAvatarModal(false)}
            onAvatarGenerated={onAvatarGenerated}
          />
          <AvatarDressUpModal
            isOpen={showDressUp}
            onClose={() => setShowDressUp(false)}
            userId={user.id}
          />
          <AvatarGalleryModal
            isOpen={showGallery}
            onClose={() => setShowGallery(false)}
            userId={user.id}
            currentAvatarUrl={profile?.avatar_url || null}
          />
        </>
      )}
    </div>
  );
}

// ルーム表示コンポーネント
interface RoomViewProps {
  mainRoom: any;
  roomItems: RoomItem[];
  likeCount: number;
  isLiked: boolean;
  isLoading: boolean;
  isOwnRoom: boolean;
  profile: Profile;
  user: any;
  isHovered: boolean;
  setIsHovered: (v: boolean) => void;
  onEditRoom: () => void;
  onCreateRoom: () => void;
  onToggleLike: () => void;
  createRoomPending: boolean;
}

function RoomView({
  mainRoom,
  roomItems,
  likeCount,
  isLiked,
  isLoading,
  isOwnRoom,
  profile,
  user,
  isHovered,
  setIsHovered,
  onEditRoom,
  onCreateRoom,
  onToggleLike,
  createRoomPending,
}: RoomViewProps) {
  const navigate = useNavigate();

  // ルームがない場合の作成画面
  if (!isLoading && !mainRoom && user) {
    return (
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
          onClick={onCreateRoom}
          disabled={createRoomPending}
          className="gap-2 shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="w-5 h-5" />
          マイルームを作成
        </Button>
      </div>
    );
  }

  // ローディング
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
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
                タップして部屋を編集
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
                onToggleLike();
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
    </>
  );
}

// アバター表示コンポーネント
interface AvatarViewProps {
  profile: Profile;
  userId: string | undefined;
  onShowAvatarModal: () => void;
  onShowDressUp: () => void;
  onShowGallery: () => void;
}

function AvatarView({
  profile,
  userId,
  onShowAvatarModal,
  onShowDressUp,
  onShowGallery,
}: AvatarViewProps) {
  return (
    <>
      {/* アバター表示 */}
      <div className="relative mb-4">
        {profile?.avatar_url ? (
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 blur-xl" />
            <Avatar className="w-64 h-64 sm:w-72 sm:h-72 border-4 border-background shadow-2xl relative z-10">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback>{profile.username?.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        ) : (
          <div className="relative">
            <div className="w-64 h-64 sm:w-72 sm:h-72 border-4 border-dashed border-muted-foreground/20 rounded-full flex items-center justify-center bg-muted/5">
              <div className="text-center">
                <User className="w-16 h-16 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground/70 text-sm">アバターを設定</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* アバターアクションボタン */}
      <div className="relative z-10 flex flex-wrap justify-center gap-3 mt-4">
        <Button variant="outline" size="sm" className="gap-2" onClick={onShowAvatarModal}>
          <Sparkles className="w-4 h-4" />
          AI生成
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={onShowDressUp}>
          <Shirt className="w-4 h-4" />
          着せ替え
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={onShowGallery}>
          <Image className="w-4 h-4" />
          ギャラリー
        </Button>
      </div>
    </>
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
