import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
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
  Compass,
  Package,
  ArrowRight,
  TrendingUp
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
import { ProfileCollection } from "@/components/profile/ProfileCollection";

interface MyRoomHomeProps {
  profile: Profile | undefined;
  onAvatarGenerated: (url: string) => void;
}

export function MyRoomHome({ profile, onAvatarGenerated }: MyRoomHomeProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"room" | "collection" | "avatar">("room");
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
      <div className="min-h-[70vh] flex flex-col items-center justify-center relative px-4 sm:px-8 animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        
        <div className="relative z-10 text-center space-y-8 max-w-md">
          <div className="w-32 h-32 mx-auto relative">
            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl animate-pulse" />
            <div className="relative w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl flex items-center justify-center border border-primary/20 shadow-xl">
              <Home className="w-14 h-14 text-primary" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              マイルームを作ろう
            </h2>
            <p className="text-muted-foreground text-lg">
              自分だけの推し部屋を3D空間に作りましょう
            </p>
          </div>

          <Button 
            size="lg" 
            onClick={() => navigate("/login")}
            className="gap-2 h-12 px-8 text-base shadow-lg hover-scale"
          >
            <User className="w-5 h-5" />
            ログインして始める
            <ArrowRight className="w-4 h-4" />
          </Button>

          <button 
            onClick={() => navigate("/rooms/explore")}
            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 mx-auto"
          >
            <Compass className="w-4 h-4" />
            他のルームを探索する
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
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
    <div className="min-h-[60vh] flex flex-col pb-24 animate-fade-in">
      {/* ヘッダーセクション */}
      <div className="text-center mb-6 pt-14 sm:pt-4">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Avatar className="w-10 h-10 border-2 border-primary/20">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {profile.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <p className="text-sm text-muted-foreground">おかえりなさい</p>
            <h1 className="text-lg font-semibold text-foreground">
              {profile.display_name || profile.username}さん
            </h1>
          </div>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="w-full max-w-lg mx-auto px-4 mb-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3 h-16 bg-muted/30 backdrop-blur-sm p-1.5 rounded-2xl border border-border/30 shadow-sm">
            <TabsTrigger 
              value="room" 
              className="flex flex-col items-center justify-center gap-1.5 h-full rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all duration-200"
            >
              <Home className="w-5 h-5" />
              <span className="text-[11px] font-medium">ルーム</span>
            </TabsTrigger>
            <TabsTrigger 
              value="collection" 
              className="flex flex-col items-center justify-center gap-1.5 h-full rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all duration-200"
            >
              <Package className="w-5 h-5" />
              <span className="text-[11px] font-medium">コレクション</span>
            </TabsTrigger>
            <TabsTrigger 
              value="avatar" 
              className="flex flex-col items-center justify-center gap-1.5 h-full rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all duration-200"
            >
              <User className="w-5 h-5" />
              <span className="text-[11px] font-medium">アバター</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 w-full">
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
        ) : activeTab === "collection" ? (
          <div className="w-full max-w-6xl mx-auto px-4 animate-fade-in">
            {user?.id && <ProfileCollection userId={user.id} />}
          </div>
        ) : (
          <AvatarView
            profile={profile}
            userId={user?.id}
            onShowAvatarModal={() => setShowAvatarModal(true)}
            onShowDressUp={() => setShowDressUp(true)}
            onShowGallery={() => setShowGallery(true)}
          />
        )}
      </div>

      {/* クイックアクション */}
      <div className="flex items-center justify-center gap-3 mt-8 px-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate("/rooms/explore")}
          className="gap-2 rounded-full"
        >
          <Compass className="w-4 h-4" />
          ルーム探索
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate("/search")}
          className="gap-2 rounded-full"
        >
          <Users className="w-4 h-4" />
          コレクター
        </Button>
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
      <div className="flex flex-col items-center justify-center px-4 animate-fade-in">
        <Card className="max-w-md w-full border-dashed border-2 bg-muted/20">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="w-24 h-24 mx-auto relative">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl animate-pulse" />
              <div className="relative w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center border border-primary/20">
                <Home className="w-12 h-12 text-primary" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                3Dルームを作成
              </h2>
              <p className="text-muted-foreground text-sm">
                グッズを自由に飾れる3D空間を作りましょう
              </p>
            </div>

            <Button 
              size="lg" 
              onClick={onCreateRoom}
              disabled={createRoomPending}
              className="gap-2 w-full h-12 hover-scale"
            >
              <Plus className="w-5 h-5" />
              ルームを作成
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ローディング
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground">ルームを準備中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 animate-fade-in">
      {/* 3Dルームプレビュー */}
      <div className="relative w-full max-w-2xl group">
        <Card className="overflow-hidden border-0 shadow-xl">
          <IsometricRoomPreview
            roomItems={roomItems}
            backgroundImage={mainRoom?.background_image}
            backgroundColor={mainRoom?.background_color}
            onClick={onOpenFullscreen}
            className="aspect-[4/3] cursor-pointer"
          />
        </Card>
        
        {/* オーバーレイボタン */}
        <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <Button 
            variant="secondary" 
            size="icon"
            className="bg-background/80 backdrop-blur-sm shadow-lg h-9 w-9"
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
            <div className="text-center space-y-2 bg-background/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg border">
              <Sparkles className="w-8 h-8 mx-auto text-primary" />
              <p className="text-sm text-foreground font-medium">
                タップしてルームを編集
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ルーム情報カード */}
      <Card className="w-full max-w-2xl mt-4 border-border/50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">
                {mainRoom?.title || "マイルーム"}
              </h2>
              <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary font-medium rounded-full">
                3D
              </span>
            </div>
            
            {/* 統計情報 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Eye className="w-4 h-4" />
                <span className="text-sm font-medium">{mainRoom?.visit_count || 0}</span>
              </div>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (user && !isOwnRoom) {
                    onToggleLike();
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 transition-colors",
                  isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                )}
                disabled={!user || isOwnRoom}
              >
                <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                <span className="text-sm font-medium">{likeCount}</span>
              </button>
            </div>
          </div>

          {/* アクションボタン */}
          {isOwnRoom && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
              <Button 
                variant="default" 
                size="sm" 
                className="gap-2 flex-1"
                onClick={onEditRoom}
              >
                <Pencil className="w-4 h-4" />
                編集する
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => navigate("/rooms/explore")}
              >
                <TrendingUp className="w-4 h-4" />
                人気ルーム
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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
    <div className="flex flex-col items-center px-4 animate-fade-in">
      {/* アバター表示 */}
      <div className="relative mb-6">
        {profile?.avatar_url ? (
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-2xl opacity-60" />
            <Avatar className="w-56 h-56 sm:w-64 sm:h-64 border-4 border-background shadow-2xl relative z-10 transition-transform duration-300 group-hover:scale-105">
              <AvatarImage src={profile.avatar_url} className="object-cover" />
              <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                {profile.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        ) : (
          <Card className="w-56 h-56 sm:w-64 sm:h-64 rounded-full border-dashed border-2 flex items-center justify-center bg-muted/10">
            <div className="text-center space-y-2">
              <User className="w-16 h-16 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">アバター未設定</p>
            </div>
          </Card>
        )}
      </div>

      {/* アバターアクションボタン */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors hover-scale"
          onClick={onShowAvatarModal}
        >
          <CardContent className="p-4 text-center">
            <Sparkles className="w-6 h-6 mx-auto mb-2 text-primary" />
            <span className="text-xs font-medium">AI生成</span>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors hover-scale"
          onClick={onShowDressUp}
        >
          <CardContent className="p-4 text-center">
            <Shirt className="w-6 h-6 mx-auto mb-2 text-primary" />
            <span className="text-xs font-medium">着せ替え</span>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors hover-scale"
          onClick={onShowGallery}
        >
          <CardContent className="p-4 text-center">
            <Image className="w-6 h-6 mx-auto mb-2 text-primary" />
            <span className="text-xs font-medium">ギャラリー</span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
