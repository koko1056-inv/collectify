import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Heart, Eye, Pencil, Plus, Sparkles, User, Shirt, Image, Maximize2, Compass, Package, ArrowRight, TrendingUp, ChevronRight } from "lucide-react";
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
import { useLanguage } from "@/contexts/LanguageContext";
import { AvatarSocialSection } from "./AvatarSocialSection";

interface MyRoomHomeProps {
  profile: Profile | undefined;
  onAvatarGenerated: (url: string) => void;
}

export function MyRoomHome({
  profile,
  onAvatarGenerated
}: MyRoomHomeProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"room" | "collection" | "avatar">("collection");
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
        
        <div className="relative z-10 text-center space-y-8 max-w-lg">
          {/* メインアイコン */}
          <div className="w-28 h-28 mx-auto relative">
            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl animate-pulse" />
            <div className="relative w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl flex items-center justify-center border border-primary/20 shadow-xl">
              <Package className="w-12 h-12 text-primary" />
            </div>
          </div>
          
          {/* メインコピー */}
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              推しグッズを記録しよう
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              あなたの大切なコレクションを管理・共有できるアプリ。<br className="hidden sm:block" />
              同じ趣味の仲間と繋がろう
            </p>
          </div>

          {/* 特徴アイコン */}
          <div className="flex justify-center gap-6 text-muted-foreground">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <span className="text-xs">コレクション</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                <Home className="w-5 h-5" />
              </div>
              <span className="text-xs">マイルーム</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                <Heart className="w-5 h-5" />
              </div>
              <span className="text-xs">交換・共有</span>
            </div>
          </div>

          {/* CTAボタン */}
          <Button size="lg" onClick={() => navigate("/login")} className="gap-2 h-12 px-8 text-base shadow-lg hover-scale">
            <User className="w-5 h-5" />
            無料ではじめる
            <ArrowRight className="w-4 h-4" />
          </Button>

          {/* サブリンク */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <button 
              onClick={() => navigate("/search")} 
              className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
            >
              <TrendingUp className="w-4 h-4" />
              グッズを見る
            </button>
            <span className="text-muted-foreground/30">|</span>
            <button 
              onClick={() => navigate("/rooms/explore")} 
              className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
            >
              <Compass className="w-4 h-4" />
              ルームを探す
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  const handleEditRoom = () => {
    setShowFullscreenRoom(true);
  };

  // フルスクリーン3Dルームモード
  if (showFullscreenRoom) {
    return <Room3DEditor profile={profile} isFullScreen={true} onClose={() => setShowFullscreenRoom(false)} />;
  }

  const tabs = [
    { id: "collection" as const, icon: Package, label: "コレクション" },
    { id: "room" as const, icon: Home, label: "ルーム" },
    { id: "avatar" as const, icon: User, label: "アバター" },
  ];

  return (
    <div className="min-h-[60vh] flex flex-col pb-24 animate-fade-in">
      {/* ヘッダー - ユーザー情報 */}
      <div className="px-4 sm:px-6 lg:px-8 mb-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/30">
            <Avatar className="w-14 h-14 border-2 border-primary/20 shadow-lg">
              <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {profile.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">
                {profile.display_name || profile.username}
              </h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate(`/user/${profile.username}`)}
              className="gap-1 hidden sm:flex"
            >
              プロフィール
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2 p-1.5 rounded-2xl bg-muted/50 backdrop-blur-sm border border-border/30">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-background text-primary shadow-md" 
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive && "text-primary")} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
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
              onCreateRoom={() => createMainRoom.mutate(t("room.myRoom"))} 
              onToggleLike={() => toggleLike.mutate()} 
              onOpenFullscreen={() => setShowFullscreenRoom(true)} 
              createRoomPending={createMainRoom.isPending} 
              t={t} 
            />
          ) : activeTab === "collection" ? (
            <div className="w-full animate-fade-in">
              {user?.id && <ProfileCollection userId={user.id} />}
            </div>
          ) : (
            <AvatarView 
              profile={profile} 
              userId={user?.id} 
              onShowAvatarModal={() => setShowAvatarModal(true)} 
              onShowDressUp={() => setShowDressUp(true)} 
              onShowGallery={() => setShowGallery(true)} 
              t={t} 
            />
          )}
        </div>
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
  t: (key: string) => string;
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
  t
}: Room3DViewProps) {
  const navigate = useNavigate();

  // ルームがない場合の作成画面
  if (!isLoading && !mainRoom && user) {
    return (
      <div className="flex flex-col items-center justify-center animate-fade-in">
        <Card className="max-w-md w-full border-dashed border-2 bg-gradient-to-br from-muted/20 to-muted/5">
          <CardContent className="pt-10 pb-10 text-center space-y-6">
            <div className="w-24 h-24 mx-auto relative">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl animate-pulse" />
              <div className="relative w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center border border-primary/20">
                <Home className="w-12 h-12 text-primary" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                {t("room.createTitle")}
              </h2>
              <p className="text-muted-foreground text-sm px-4">
                {t("room.createDesc")}
              </p>
            </div>

            <Button 
              size="lg" 
              onClick={onCreateRoom} 
              disabled={createRoomPending} 
              className="gap-2 w-full max-w-xs h-12 hover-scale"
            >
              <Plus className="w-5 h-5" />
              {t("room.create")}
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
        <p className="text-muted-foreground">{t("room.preparing")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* 3Dルームプレビュー */}
      <div className="relative w-full group">
        <Card className="overflow-hidden border-0 shadow-xl rounded-2xl">
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
            onClick={e => {
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
                {t("room.tapToEdit")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ルーム情報カード */}
      <Card className="w-full border-border/50 rounded-2xl shadow-sm">
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">
                {mainRoom?.title || t("room.myRoom")}
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
                onClick={e => {
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
              <Button variant="default" size="sm" className="gap-2 flex-1" onClick={onEditRoom}>
                <Pencil className="w-4 h-4" />
                {t("room.edit")}
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/rooms/explore")}>
                <TrendingUp className="w-4 h-4" />
                {t("room.popular")}
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
  t: (key: string) => string;
}

function AvatarView({
  profile,
  userId,
  onShowAvatarModal,
  onShowDressUp,
  onShowGallery,
  t
}: AvatarViewProps) {
  return (
    <div className="flex flex-col items-center animate-fade-in">
      {/* アバター表示 */}
      <div className="relative mb-8">
        {profile?.avatar_url ? (
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-2xl opacity-60" />
            <Avatar className="w-48 h-48 sm:w-56 sm:h-56 border-4 border-background shadow-2xl relative z-10 transition-transform duration-300 group-hover:scale-105">
              <AvatarImage src={profile.avatar_url} className="object-cover" />
              <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                {profile.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        ) : (
          <Card className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border-dashed border-2 flex items-center justify-center bg-muted/10">
            <div className="text-center space-y-2">
              <User className="w-16 h-16 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">{t("avatar.notSet")}</p>
            </div>
          </Card>
        )}
      </div>

      {/* アバターアクションボタン */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
        <Card 
          className="cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 hover-scale group" 
          onClick={onShowAvatarModal}
        >
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-medium">{t("avatar.aiGenerate")}</span>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 hover-scale group" 
          onClick={onShowDressUp}
        >
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Shirt className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-medium">{t("avatar.dressUp")}</span>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 hover-scale group" 
          onClick={onShowGallery}
        >
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Image className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-medium">{t("avatar.gallery")}</span>
          </CardContent>
        </Card>
      </div>

      {/* ソーシャルセクション */}
      {userId && (
        <div className="w-full mt-8">
          <AvatarSocialSection userId={userId} avatarUrl={profile?.avatar_url} />
        </div>
      )}
    </div>
  );
}
