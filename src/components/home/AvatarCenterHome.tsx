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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [recentAvatars, setRecentAvatars] = useState<Array<{ id: string; image_url: string }>>([]);

  // 最新のアバターを取得（ギャラリーまたはプロフィールから）
  const fetchCurrentAvatar = async () => {
    if (!profile?.id) return;

    try {
      // まずギャラリーから is_current=true のアバターを取得
      const { data: galleryData, error: galleryError } = await supabase
        .from("avatar_gallery")
        .select("image_url")
        .eq("user_id", profile.id)
        .eq("is_current", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!galleryError && galleryData && galleryData.length > 0) {
        setCurrentAvatarUrl(galleryData[0].image_url);
        return;
      }

      // ギャラリーになければプロフィールから取得
      const { data: profileData } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", profile.id)
        .single();

      if (profileData?.avatar_url) {
        setCurrentAvatarUrl(profileData.avatar_url);
      }
    } catch (error) {
      console.error("Error fetching current avatar:", error);
    }
  };

  // 最近使ったアバターを取得
  const fetchRecentAvatars = async () => {
    if (!profile?.id) return;

    try {
      const { data } = await supabase
        .from("avatar_gallery")
        .select("id, image_url")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(4); // 現在のものを含めて4つ取得

      if (data) {
        // 現在のアバター以外の最新3つを表示
        const filtered = data.filter(avatar => avatar.image_url !== currentAvatarUrl).slice(0, 3);
        setRecentAvatars(filtered);
      }
    } catch (error) {
      console.error("Error fetching recent avatars:", error);
    }
  };

  // アバターをクイック切り替え
  const handleQuickSwitch = async (avatarUrl: string, avatarId: string) => {
    if (!profile?.id) return;

    try {
      // すべてのアバターの is_current を false に設定
      await supabase
        .from("avatar_gallery")
        .update({ is_current: false })
        .eq("user_id", profile.id);

      // 選択したアバターを is_current = true に設定
      await supabase
        .from("avatar_gallery")
        .update({ is_current: true })
        .eq("id", avatarId);

      // プロフィールの avatar_url を更新
      await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", profile.id);

      toast.success("アバターを切り替えました");
      
      // 現在のアバターと最近のアバターを再取得
      await fetchCurrentAvatar();
      await fetchRecentAvatars();
    } catch (error) {
      console.error("Error switching avatar:", error);
      toast.error("アバターの切り替えに失敗しました");
    }
  };

  // 初回ロード時とプロフィールID変更時にアバターを取得
  useEffect(() => {
    fetchCurrentAvatar();
  }, [profile?.id]);

  // 現在のアバターが変更されたら最近のアバターを再取得
  useEffect(() => {
    if (currentAvatarUrl) {
      fetchRecentAvatars();
    }
  }, [currentAvatarUrl, profile?.id]);

  // リアルタイムでアバター更新を監視
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('avatar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'avatar_gallery',
          filter: `user_id=eq.${profile.id}`
        },
        () => {
          fetchCurrentAvatar();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.id}`
        },
        () => {
          fetchCurrentAvatar();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  // アバターがない場合は自動的にモーダルを開く
  useEffect(() => {
    if (!currentAvatarUrl && !profile?.avatar_url) {
      setShowAvatarModal(true);
    }
  }, [currentAvatarUrl, profile?.avatar_url]);

  const buttons = [
    {
      icon: Image,
      label: "アバターギャラリー",
      onClick: () => setShowGallery(true),
      color: "from-gray-800 to-gray-900"
    },
    {
      icon: Dices,
      label: "ランダムピックアップ",
      onClick: () => setShowRandomPickup(true),
      color: "from-gray-700 to-gray-800"
    },
    {
      icon: Shirt,
      label: "グッズ着せ替え",
      onClick: () => setShowDressUp(true),
      color: "from-gray-600 to-gray-700"
    },
    {
      icon: BarChart3,
      label: "コレクション分析",
      onClick: () => setShowAnalytics(true),
      color: "from-gray-500 to-gray-600"
    }
  ];

  return (
    <>
      <div className="min-h-[80vh] flex flex-col items-center justify-center relative px-4 sm:px-8">
        {/* 背景のグラデーション */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 rounded-3xl" />
        
        {/* アバター */}
        <div className="relative mb-4 mt-16 sm:mt-0">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 blur-xl" />
            <Avatar 
              className="w-72 h-72 sm:w-80 sm:h-80 lg:w-96 lg:h-96 border-4 border-background shadow-2xl relative z-10 transition-transform hover:scale-105 cursor-pointer"
              onClick={() => setShowGallery(true)}
            >
              <AvatarImage src={currentAvatarUrl || profile?.avatar_url || undefined} />
              <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                {profile?.username?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* クイックアクセス - 最近使ったアバター */}
        {recentAvatars.length > 0 && (
          <div className="flex gap-3 mb-6">
            {recentAvatars.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => handleQuickSwitch(avatar.image_url, avatar.id)}
                className="relative group"
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-background shadow-lg hover:scale-110 transition-all duration-300 relative z-10 cursor-pointer">
                  <AvatarImage src={avatar.image_url} />
                  <AvatarFallback className="text-sm bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                    {profile?.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </button>
            ))}
          </div>
        )}

        {/* 機能ボタン */}
        <div className="grid grid-cols-2 sm:flex gap-4 sm:gap-6 mb-8 max-w-md w-full px-4">
          {buttons.map((btn, index) => (
            <div key={index} className="relative group flex flex-col items-center">
              <Button
                onClick={btn.onClick}
                size="lg"
                className={`rounded-full w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 shadow-lg hover:scale-110 transition-all duration-300 bg-gradient-to-br ${btn.color} border-2 border-background`}
              >
                <btn.icon className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />
              </Button>
              <div className="mt-2 sm:absolute sm:top-full sm:mt-2 sm:left-1/2 sm:-translate-x-1/2 whitespace-nowrap sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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
        onClose={() => {
          setShowDressUp(false);
          fetchCurrentAvatar();
        }}
        userId={profile?.id}
      />

      <AvatarGalleryModal
        isOpen={showGallery}
        onClose={() => {
          setShowGallery(false);
          fetchCurrentAvatar();
        }}
        userId={profile?.id}
        currentAvatarUrl={currentAvatarUrl || profile?.avatar_url}
      />
    </>
  );
}
