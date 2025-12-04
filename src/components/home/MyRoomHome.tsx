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
  Image,
  Maximize2,
  Compass
} from "lucide-react";
import { useMyRoom, RoomItem } from "@/hooks/useMyRoom";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/types";
import { cn } from "@/lib/utils";
import { AvatarGenerationModal } from "@/components/profile/AvatarGenerationModal";
import { AvatarDressUpModal } from "./avatar-center/AvatarDressUpModal";
import { AvatarGalleryModal } from "./avatar-center/AvatarGalleryModal";
import { IsometricRoomPreview } from "@/components/room3d/IsometricRoomPreview";
import { Room3DEditor } from "@/components/room3d/Room3DEditor";

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
  const [showFullscreenRoom, setShowFullscreenRoom] = useState(false);
  
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

  // 未ログイン時のログイン促進表示
  if (!user) {
    return (
      <div className="min-h-[50vh] sm:min-h-[60vh] flex flex-col items-center justify-start sm:justify-center relative px-4 sm:px-8 pt-4 sm:pt-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-blue-900/10 to-pink-900/10 rounded-3xl" />
        
        <div className="relative z-10 text-center space-y-6 max-w-md">
          <div className="w-40 h-40 mx-auto relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-full blur-xl animate-pulse" />
            <div className="relative w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center border border-purple-500/30">
              <Home className="w-20 h-20 text-purple-400" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              マイルームを作ろう！
            </h2>
            <p className="text-muted-foreground">
              ログインして、自分だけの推し部屋を3D空間に作りましょう
            </p>
          </div>

          <Button 
            size="lg" 
            onClick={() => navigate("/login")}
            className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25 transition-all hover:scale-105"
          >
            <User className="w-5 h-5" />
            ログインする
          </Button>
        </div>

        {/* エクスプローラーへのリンク */}
        <div className="relative z-10 mt-6 flex items-center gap-4">
          <button 
            onClick={() => navigate("/rooms/explore")}
            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 bg-background/50 backdrop-blur-sm px-4 py-2 rounded-full"
          >
            <Compass className="w-4 h-4" />
            ルームを探索
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-muted-foreground">プロフィールを読み込み中...</p>
      </div>
    );
  }

  const handleEditRoom = () => {
    setShowFullscreenRoom(true);
  };

  // フルスクリーン3Dルームモード
  if (showFullscreenRoom) {
    return (
      <Room3DEditor 
        profile={profile} 
        isFullScreen={true}
        onClose={() => setShowFullscreenRoom(false)}
      />
    );
  }

  return (
    <div className="min-h-[50vh] sm:min-h-[60vh] flex flex-col items-center justify-start sm:justify-center relative px-4 sm:px-8 pt-2 sm:pt-0">
      {/* 背景のグラデーション - ダーク&ネオン */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-blue-900/10 to-pink-900/10 rounded-3xl" />
      
      {/* タブ切り替え */}
      <div className="relative z-10 mb-4 sm:mb-6 mt-2 sm:mt-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2 bg-background/80 backdrop-blur-sm">
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
        <Room3DView 
          mainRoom={mainRoom}
          roomItems={roomItems}
          likeCount={likeCount}
          isLiked={isLiked}
          isLoading={isLoading}
          isOwnRoom={isOwnRoom}
          profile={profile}
          user={user}
          onEditRoom={handleEditRoom}
          onCreateRoom={() => createMainRoom.mutate("マイルーム")}
          onToggleLike={() => toggleLike.mutate()}
          onOpenFullscreen={() => setShowFullscreenRoom(true)}
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

      {/* エクスプローラーへのリンク */}
      <div className="relative z-10 mt-6 flex items-center gap-4">
        <button 
          onClick={() => navigate("/rooms/explore")}
          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 bg-background/50 backdrop-blur-sm px-4 py-2 rounded-full"
        >
          <Compass className="w-4 h-4" />
          ルームを探索
        </button>
        <button 
          onClick={() => navigate("/search")}
          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          コレクターを見る
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

// 3Dルーム表示コンポーネント
interface Room3DViewProps {
  mainRoom: any;
  roomItems: RoomItem[];
  likeCount: number;
  isLiked: boolean;
  isLoading: boolean;
  isOwnRoom: boolean;
  profile: Profile;
  user: any;
  onEditRoom: () => void;
  onCreateRoom: () => void;
  onToggleLike: () => void;
  onOpenFullscreen: () => void;
  createRoomPending: boolean;
}

function Room3DView({
  mainRoom,
  roomItems,
  likeCount,
  isLiked,
  isLoading,
  isOwnRoom,
  profile,
  user,
  onEditRoom,
  onCreateRoom,
  onToggleLike,
  onOpenFullscreen,
  createRoomPending,
}: Room3DViewProps) {
  const navigate = useNavigate();

  // ルームがない場合の作成画面
  if (!isLoading && !mainRoom && user) {
    return (
      <div className="relative z-10 text-center space-y-6 max-w-md">
        <div className="w-40 h-40 mx-auto relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-full blur-xl animate-pulse" />
          <div className="relative w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center border border-purple-500/30">
            <Home className="w-20 h-20 text-purple-400" />
          </div>
        </div>
        
        <div className="space-y-3">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            3Dマイルームを作ろう！
          </h2>
          <p className="text-muted-foreground">
            自分だけの推し部屋を3D空間に作って、グッズを自由に飾りましょう
          </p>
        </div>

        <Button 
          size="lg" 
          onClick={onCreateRoom}
          disabled={createRoomPending}
          className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25 transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          3Dルームを作成
        </Button>
      </div>
    );
  }

  // ローディング
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground">3Dルームを準備中...</p>
      </div>
    );
  }

  return (
    <>
      {/* 3Dルームプレビュー */}
      <div className="relative w-full max-w-2xl group">
        <IsometricRoomPreview
          roomItems={roomItems}
          backgroundImage={mainRoom?.background_image}
          backgroundColor={mainRoom?.background_color}
          onClick={onOpenFullscreen}
          className="aspect-[4/3] shadow-2xl shadow-purple-500/10"
        />
        
        {/* オーバーレイボタン */}
        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="secondary" 
            size="icon"
            className="bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white"
            onClick={(e) => {
              e.stopPropagation();
              onOpenFullscreen();
            }}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>

        {/* アイテムがない場合のヒント */}
        {roomItems.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center space-y-2 bg-black/60 backdrop-blur-sm p-6 rounded-xl">
              <Sparkles className="w-8 h-8 mx-auto text-purple-400" />
              <p className="text-sm text-white/80">
                クリックして3Dルームを編集
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ルーム情報 */}
      <div className="relative z-10 mt-6 text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
          {mainRoom?.title || "マイルーム"}
          <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full">
            3D
          </span>
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
          {isOwnRoom && (
            <Button 
              variant="default" 
              size="sm" 
              className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600"
              onClick={onEditRoom}
            >
              <Pencil className="w-4 h-4" />
              編集
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => navigate("/rooms/explore")}
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
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 blur-xl" />
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
