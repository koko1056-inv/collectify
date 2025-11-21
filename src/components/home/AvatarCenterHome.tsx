import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dices, BarChart3, Shirt, ChevronDown, Image } from "lucide-react";
import { Profile } from "@/types";
import { AvatarGenerationModal } from "@/components/profile/AvatarGenerationModal";
import { RandomPickupModal } from "./avatar-center/RandomPickupModal";
import { CollectionAnalyticsModal } from "./avatar-center/CollectionAnalyticsModal";
import { AvatarDressUpModal } from "./avatar-center/AvatarDressUpModal";
import { AvatarGalleryModal } from "./avatar-center/AvatarGalleryModal";

interface AvatarCenterHomeProps {
  profile: Profile;
  onAvatarGenerated: (url: string) => void;
}

export function AvatarCenterHome({ profile, onAvatarGenerated }: AvatarCenterHomeProps) {
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showRandomPickup, setShowRandomPickup] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showDressUp, setShowDressUp] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  // アバターがない場合は自動的にモーダルを開く
  useEffect(() => {
    if (!profile?.avatar_url) {
      setShowAvatarModal(true);
    }
  }, [profile?.avatar_url]);

  const buttons = [
    {
      icon: Dices,
      label: "ランダムピックアップ",
      onClick: () => setShowRandomPickup(true),
      position: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Shirt,
      label: "グッズ着せ替え",
      onClick: () => setShowDressUp(true),
      position: "top-1/2 right-0 translate-x-1/2 -translate-y-1/2",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: BarChart3,
      label: "コレクション分析",
      onClick: () => setShowAnalytics(true),
      position: "top-1/2 left-0 -translate-x-1/2 -translate-y-1/2",
      color: "from-orange-500 to-red-500"
    }
  ];

  return (
    <>
      <div className="min-h-[80vh] flex flex-col items-center justify-center relative px-4">
        {/* 背景のグラデーション */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 rounded-3xl" />
        
        {/* アバター中心エリア */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 mb-8">
          {/* 中央の円形背景 */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 animate-pulse" />
          
          {/* アバター */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="relative cursor-pointer group"
              onClick={() => setShowGallery(true)}
              title="ギャラリーを開く"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 blur-xl" />
              <Avatar className="w-32 h-32 sm:w-40 sm:h-40 border-4 border-background shadow-2xl relative z-10 group-hover:scale-105 transition-transform">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                  {profile?.username?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              {/* ギャラリーアイコン */}
              <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <Image className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* 機能ボタン */}
          {buttons.map((btn, index) => (
            <div key={index} className={`absolute ${btn.position} z-20`}>
              <Button
                onClick={btn.onClick}
                size="lg"
                className={`rounded-full w-16 h-16 sm:w-20 sm:h-20 shadow-lg hover:scale-110 transition-all duration-300 bg-gradient-to-br ${btn.color} border-2 border-background group`}
              >
                <div className="flex flex-col items-center gap-1">
                  <btn.icon className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
              </Button>
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs sm:text-sm font-medium bg-background/90 px-3 py-1 rounded-full shadow-lg">
                  {btn.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* スクロール誘導 */}
        <div className="flex flex-col items-center gap-2 animate-bounce mt-8">
          <p className="text-sm text-muted-foreground">他のコレクターを見る</p>
          <ChevronDown className="w-6 h-6 text-muted-foreground" />
        </div>
      </div>

      {/* モーダル */}
      <AvatarGenerationModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onAvatarGenerated={onAvatarGenerated}
      />

      <RandomPickupModal
        isOpen={showRandomPickup}
        onClose={() => setShowRandomPickup(false)}
        userId={profile?.id}
      />

      <CollectionAnalyticsModal
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        userId={profile?.id}
      />

      <AvatarDressUpModal
        isOpen={showDressUp}
        onClose={() => setShowDressUp(false)}
        userId={profile?.id}
        avatarUrl={profile?.avatar_url}
      />

      <AvatarGalleryModal
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        userId={profile?.id}
        currentAvatarUrl={profile?.avatar_url}
      />
    </>
  );
}
