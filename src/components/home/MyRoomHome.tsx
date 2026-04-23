import { useState } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Heart, Eye, Pencil, Plus, Sparkles, User, Image, Compass, Package, ArrowRight, TrendingUp, ChevronRight, Star, BookOpen, Crown, Award, Trophy, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import { useMyRoom, RoomItem } from "@/hooks/useMyRoom";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/types";
import { cn } from "@/lib/utils";
import { MyAiRoomsView } from "@/components/ai-room/MyAiRoomsView";
import { ProfileCollection } from "@/components/profile/ProfileCollection";
import { useLanguage } from "@/contexts/LanguageContext";
import { AvatarSocialSection } from "./AvatarSocialSection";
import { AvatarCenterHome } from "./AvatarCenterHome";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MyRoomHomeProps {
  profile: Profile | undefined;
}

export function MyRoomHome({
  profile,
}: MyRoomHomeProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"room" | "collection" | "avatar">("collection");
  
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
    setActiveTab("room");
  };

  // タブバッジの状態（新着があるかどうか）
  // 実際のアプリではこれをSupabaseから取得
  const tabBadges = {
    collection: false, // コレクションに新着がある場合true
    room: roomItems.length === 0 && mainRoom, // ルームが空の場合にヒントとして表示
    avatar: !profile?.avatar_url, // アバター未設定の場合
  };

  const tabs = [
    { id: "collection" as const, icon: Package, label: "コレクション", badge: tabBadges.collection },
    { id: "room" as const, icon: Home, label: "ルーム", badge: tabBadges.room },
    { id: "avatar" as const, icon: User, label: "アバター", badge: tabBadges.avatar },
  ];

  return (
    <div className="min-h-[60vh] flex flex-col pb-24 animate-fade-in">
      {/* オンボーディングチェックリスト */}
      <div className="px-4 sm:px-6 lg:px-8 mb-4">
        <div className="max-w-4xl mx-auto">
          <OnboardingChecklist />
        </div>
      </div>

      {/* ヒーローカード - コレクターの部屋感を強化 */}
      <div className="px-4 sm:px-6 lg:px-8 mb-5">
        <div className="max-w-4xl mx-auto">
          <HeroCard profile={profile} userId={user?.id} />
        </div>
      </div>

      {/* タブナビゲーション - 明確なセグメント型 */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative flex p-1 rounded-full bg-muted/60 border border-border/30">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full text-sm font-medium transition-colors duration-200 z-10",
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-tab-bg"
                      className="absolute inset-0 rounded-full bg-primary shadow-md"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    <Icon className="w-4 h-4" />
                    <span className="text-xs sm:text-sm">{tab.label}</span>
                    {tab.badge && !isActive && (
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 w-full">
        <div className={cn(activeTab === "room" ? "w-full" : "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8")}>
          {activeTab === "collection" && (
            <div className="w-full animate-fade-in">
              {user?.id && <ProfileCollection userId={user.id} />}
            </div>
          )}
          {activeTab === "room" && (
            <div className="w-full animate-fade-in py-2">
              <MyAiRoomsView />
            </div>
          )}
          {activeTab === "avatar" && (
            <div className="w-full animate-fade-in">
              <AvatarCenterHome profile={profile} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ミニ統計コンポーネント - 棚に並ぶグッズ数
// ==================== ヒーローカード ====================

/**
 * コレクターの部屋感を強化したヒーローカード。
 * - 大きいアバター + グロー + テーマ色グラデ背景
 * - 時間帯ベースの挨拶 + 動的サブコピー
 * - コレクターランク（アイテム数で変動）
 * - ミニ統計を1行のインラインに圧縮
 */
function HeroCard({ profile, userId }: { profile: Profile; userId: string | undefined }) {
  const navigate = useNavigate();

  // 統計を一括取得（MiniStatのクエリを統合）
  const { data: stats = { items: 0, wishlists: 0, favorites: 0 } } = useQuery({
    queryKey: ["hero-stats", userId],
    queryFn: async () => {
      if (!userId) return { items: 0, wishlists: 0, favorites: 0 };
      const [items, wishlists, favorites] = await Promise.all([
        supabase.from("user_items").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("wishlists").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("collection_likes").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      return {
        items: items.count ?? 0,
        wishlists: wishlists.count ?? 0,
        favorites: favorites.count ?? 0,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // 時間帯挨拶
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return "こんばんは";
    if (h < 11) return "おはよう";
    if (h < 18) return "こんにちは";
    return "こんばんは";
  })();

  // コレクターランク（アイテム数で段階）
  const rank = (() => {
    const n = stats.items;
    if (n >= 500) return { label: "Diamond", icon: Crown, color: "from-cyan-400 to-blue-500", textColor: "text-cyan-700 dark:text-cyan-300" };
    if (n >= 200) return { label: "Gold", icon: Trophy, color: "from-amber-400 to-orange-500", textColor: "text-amber-700 dark:text-amber-300" };
    if (n >= 50) return { label: "Silver", icon: Award, color: "from-slate-300 to-slate-500", textColor: "text-slate-700 dark:text-slate-300" };
    if (n >= 10) return { label: "Bronze", icon: Star, color: "from-orange-300 to-rose-400", textColor: "text-orange-700 dark:text-orange-300" };
    return { label: "Rookie", icon: Sparkles, color: "from-pink-300 to-purple-400", textColor: "text-pink-700 dark:text-pink-300" };
  })();

  const RankIcon = rank.icon;
  const displayName = profile.display_name || profile.username || "コレクター";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/40 shadow-sm">
      {/* 背景: ヒーローグラデ + 装飾 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-card to-card" />
      <div className="absolute -top-6 -right-6 w-40 h-40 rounded-full bg-gradient-to-br from-primary/15 to-transparent blur-2xl" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-gradient-to-tr from-pink-500/10 to-transparent blur-3xl" />

      {/* 装飾: ドットパターン */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 0.5px, transparent 0.5px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative p-5 sm:p-6">
        {/* 上段: アバター + 名前 + ランクバッジ */}
        <div className="flex items-start gap-4 mb-4">
          {/* アバター */}
          <button
            onClick={() => navigate(`/user/${profile.id}`)}
            className="relative shrink-0 group"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className={cn(
                "absolute -inset-1 rounded-full blur-md opacity-60 bg-gradient-to-br",
                rank.color
              )}
            />
            <Avatar className="relative w-[72px] h-[72px] border-2 border-background shadow-xl ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
              <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold text-xl">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* ランクアイコン (右下にピン) */}
            <div
              className={cn(
                "absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br border-2 border-background",
                rank.color
              )}
            >
              <RankIcon className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
          </button>

          {/* 名前と挨拶 */}
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-xs text-muted-foreground mb-0.5">
              {greeting}、
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate leading-tight">
              {displayName}
              <span className="text-muted-foreground font-medium text-sm">さん</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
              <div
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r text-white shadow-sm",
                  rank.color
                )}
              >
                <RankIcon className="w-3 h-3" />
                {rank.label}
              </div>
              <span className="text-[10px] text-muted-foreground">コレクター</span>
            </div>
          </div>

          {/* プロフィールへ */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/user/${profile.id}`)}
            className="shrink-0 h-9 w-9 rounded-xl"
            title="プロフィールを見る"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* 下段: ステータス 1ライン */}
        <div className="flex items-center justify-around gap-1 pt-3 border-t border-border/40">
          <StatInline icon={Package} value={stats.items} label="グッズ" />
          <div className="w-px h-8 bg-border/60" />
          <StatInline icon={Heart} value={stats.wishlists} label="ウィッシュ" />
          <div className="w-px h-8 bg-border/60" />
          <StatInline icon={Star} value={stats.favorites} label="お気に入り" />
        </div>
      </div>
    </div>
  );
}

function StatInline({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
      <div className="flex items-center gap-1">
        <Icon className="w-3.5 h-3.5 text-primary/70" />
        <span className="text-base sm:text-lg font-bold text-foreground tabular-nums">
          {value.toLocaleString()}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

// ==================== MiniStat (旧API、他所から参照されている場合に残す) ====================

function MiniStat({ icon: Icon, label, userId, type }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  userId: string | undefined;
  type: 'items' | 'wishlists' | 'favorites';
}) {
  const { data: count = 0 } = useQuery({
    queryKey: ['mini-stat', userId, type],
    queryFn: async () => {
      if (!userId) return 0;
      const table = type === 'items' ? 'user_items' : type === 'wishlists' ? 'wishlists' : 'collection_likes';
      const column = type === 'favorites' ? 'user_id' : 'user_id';
      const { count, error } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq(column, userId);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl bg-muted/40 border border-border/20">
      <Icon className="w-4 h-4 text-primary/70" />
      <span className="text-base font-bold text-foreground">{count}</span>
      <span className="text-[10px] text-muted-foreground leading-none">{label}</span>
    </div>
  );
}

// (旧Room3DView コンポーネントは MyRoomScene に置き換えたため削除)

// アバター表示コンポーネント
interface AvatarViewProps {
  profile: Profile;
  userId: string | undefined;
  onOpenAvatarStudio: () => void;
  t: (key: string) => string;
}

function AvatarView({
  profile,
  userId,
  onOpenAvatarStudio,
  t
}: AvatarViewProps) {
  const hasAvatar = !!profile?.avatar_url;

  return (
    <div className="flex flex-col items-center animate-fade-in px-4">
      {/* アバター表示エリア */}
      <div className="relative mb-6">
        {hasAvatar ? (
          <button 
            onClick={onOpenAvatarStudio}
            className="relative group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
          >
            <div className="absolute -inset-3 bg-gradient-to-br from-primary/30 to-primary/5 rounded-full blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
            <Avatar className="w-40 h-40 sm:w-48 sm:h-48 border-4 border-background shadow-2xl relative z-10 transition-all duration-300 group-hover:scale-105 group-hover:shadow-primary/20 group-hover:shadow-xl">
              <AvatarImage src={profile.avatar_url} className="object-cover" />
              <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                {profile.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* ホバー時のオーバーレイ */}
            <div className="absolute inset-0 z-20 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </button>
        ) : (
          /* アバター未設定時の生成誘導 */
          <button
            onClick={onOpenAvatarStudio}
            className="relative group cursor-pointer focus:outline-none"
          >
            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border-2 border-dashed border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col items-center justify-center gap-3 transition-all duration-300 group-hover:border-primary group-hover:from-primary/20 group-hover:to-primary/10 group-hover:scale-105">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <span className="text-sm font-medium text-primary">{t("avatar.aiGenerate")}</span>
            </div>
          </button>
        )}
      </div>

      {/* アバタースタジオを開くボタン */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 w-full max-w-sm mb-6">
        <button 
          onClick={onOpenAvatarStudio}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-base">アバタースタジオ</span>
        </button>
      </div>

      {/* ソーシャルセクション */}
      {userId && (
        <div className="w-full">
          <AvatarSocialSection userId={userId} avatarUrl={profile?.avatar_url} />
        </div>
      )}
    </div>
  );
}
