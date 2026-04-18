import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Crown,
  Trophy,
  Award,
  Star,
  Sparkles,
  Share2,
  Settings,
  Pencil,
  LogOut,
  MessageCircle,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Profile } from "@/types";
import { useState } from "react";
import { FollowList } from "./FollowList";
import { FollowButton } from "./FollowButton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { ChatModal } from "@/components/chat/ChatModal";
import { toast } from "sonner";

interface ProfileHeroProps {
  profile: Profile;
  bio: string;
  xUsername: string;
  isOwnProfile: boolean;
  isUploading?: boolean;
  previewUrl?: string | null;
  onAvatarUpload?: (file: File) => void;
  onShare: () => void;
  onEdit?: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
}

export function ProfileHero({
  profile,
  bio,
  xUsername,
  isOwnProfile,
  isUploading,
  previewUrl,
  onAvatarUpload,
  onShare,
  onEdit,
  onOpenSettings,
  onLogout,
}: ProfileHeroProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const handleCoverUpload = async (file: File) => {
    if (!isOwnProfile || !user?.id) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("画像は5MB以下にしてください");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("JPEG / PNG / WebP / GIF のみ対応しています");
      return;
    }
    setCoverUploading(true);
    const localUrl = URL.createObjectURL(file);
    setCoverPreview(localUrl);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/cover-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("profile_images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage
        .from("profile_images")
        .getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ cover_image_url: publicUrl })
        .eq("id", user.id);
      if (updErr) throw updErr;
      setCoverPreview(publicUrl);
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("カバー画像を更新しました");
    } catch (e) {
      console.error("Cover upload error:", e);
      toast.error("アップロードに失敗しました");
      setCoverPreview(null);
    } finally {
      setCoverUploading(false);
    }
  };

  // 統計
  const { data: stats } = useQuery({
    queryKey: ["profile-hero-stats", profile.id],
    queryFn: async () => {
      const [items, followers, following, posts] = await Promise.all([
        supabase
          .from("user_items")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profile.id),
        supabase
          .from("profiles")
          .select("followers_count, following_count")
          .eq("id", profile.id)
          .maybeSingle(),
        Promise.resolve({}),
        supabase
          .from("item_posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profile.id),
      ]);
      return {
        items: items.count ?? 0,
        followers: followers.data?.followers_count ?? 0,
        following: followers.data?.following_count ?? 0,
        posts: posts.count ?? 0,
      };
    },
    staleTime: 2 * 60 * 1000,
  });

  // ランク
  const rank = (() => {
    const n = stats?.items ?? 0;
    if (n >= 500) return { label: "Diamond", icon: Crown, color: "from-cyan-400 to-blue-500" };
    if (n >= 200) return { label: "Gold", icon: Trophy, color: "from-amber-400 to-orange-500" };
    if (n >= 50) return { label: "Silver", icon: Award, color: "from-slate-300 to-slate-500" };
    if (n >= 10) return { label: "Bronze", icon: Star, color: "from-orange-300 to-rose-400" };
    return { label: "Rookie", icon: Sparkles, color: "from-pink-300 to-purple-400" };
  })();
  const RankIcon = rank.icon;

  const displayName = profile.display_name || profile.username || "コレクター";
  const avatarSrc = previewUrl || profile.avatar_url || undefined;
  const coverSrc = coverPreview || profile.cover_image_url || null;
  const hasCustomCover = !!coverSrc;

  return (
    <>
      <div className="relative overflow-hidden rounded-b-3xl sm:rounded-3xl">
        {/* カバー: カスタム画像 or グラデーション */}
        <div
          className={cn(
            "relative h-32 sm:h-44 overflow-hidden",
            !hasCustomCover && "bg-gradient-to-br",
            !hasCustomCover && rank.color
          )}
        >
          {hasCustomCover && (
            <>
              <img
                src={coverSrc!}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />
            </>
          )}
          {!hasCustomCover && (
            <div className="absolute inset-0 overflow-hidden">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="absolute text-white/30"
                  style={{
                    left: `${[10, 30, 55, 75, 90][i]}%`,
                    top: `${[20, 50, 30, 60, 35][i]}%`,
                    fontSize: `${14 + (i % 3) * 4}px`,
                  }}
                  animate={{ y: [0, -8, 0], rotate: [0, 20, 0] }}
                  transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  {["✨", "💖", "🌸", "⭐", "🎀"][i]}
                </motion.div>
              ))}
            </div>
          )}

          <div className="absolute top-3 right-3 flex gap-1 z-10">
            {isOwnProfile && (
              <label
                className={cn(
                  "w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm flex items-center justify-center cursor-pointer transition-colors",
                  coverUploading && "pointer-events-none opacity-70"
                )}
                aria-label="カバー画像を変更"
                title="カバー画像を変更"
              >
                {coverUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={coverUploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCoverUpload(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            )}
            {isOwnProfile ? (
              <>
                <button
                  onClick={onOpenSettings}
                  className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm flex items-center justify-center"
                  aria-label="設定"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={onLogout}
                  className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm flex items-center justify-center"
                  aria-label="ログアウト"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={onShare}
                className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm flex items-center justify-center"
                aria-label="共有"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 本体カード */}
        <div className="bg-card pt-14 px-4 sm:px-6 pb-4">
          {/* アバター (カバーに半分かぶる) */}
          <div className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0">
            <label className={cn("relative block group", isOwnProfile && !isUploading && "cursor-pointer")}>
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className={cn("absolute -inset-1 rounded-full blur-md opacity-60 bg-gradient-to-br", rank.color)}
              />
              <Avatar className="relative w-24 h-24 sm:w-28 sm:h-28 border-[3px] border-card shadow-xl ring-2 ring-background">
                <AvatarImage src={avatarSrc} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold text-2xl">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* ランクピン */}
              <div
                className={cn(
                  "absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br border-2 border-card",
                  rank.color
                )}
              >
                <RankIcon className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              {isOwnProfile && onAvatarUpload && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onAvatarUpload(file);
                    }}
                  />
                  <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Pencil className="w-4 h-4 text-white" />
                  </div>
                </>
              )}
            </label>
          </div>

          {/* 名前エリア (モバイルは中央寄せ、デスクトップはアバター右) */}
          <div className="text-center sm:text-left sm:ml-36">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">{displayName}</h1>
              <div
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white bg-gradient-to-r shadow-sm",
                  rank.color
                )}
              >
                <RankIcon className="w-3 h-3" />
                {rank.label}
              </div>
            </div>
            {profile.username && profile.display_name && (
              <p className="text-xs text-muted-foreground mt-0.5">@{profile.username}</p>
            )}

            {/* 自己紹介 */}
            {bio && (
              <p className="text-sm text-foreground/90 mt-2 whitespace-pre-wrap leading-relaxed max-w-lg mx-auto sm:mx-0">
                {bio}
              </p>
            )}

            {/* 外部リンク */}
            {xUsername && (
              <a
                href={`https://x.com/${xUsername.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
              >
                𝕏 @{xUsername.replace(/^@/, "")}
              </a>
            )}
          </div>

          {/* 統計: 3つに絞る */}
          <div className="flex items-center justify-around gap-1 mt-4 pt-4 border-t border-border">
            <StatButton value={stats?.items ?? 0} label="グッズ" />
            <div className="w-px h-8 bg-border" />
            <StatButton
              value={stats?.followers ?? 0}
              label="フォロワー"
              onClick={() => setShowFollowers(true)}
            />
            <div className="w-px h-8 bg-border" />
            <StatButton
              value={stats?.following ?? 0}
              label="フォロー中"
              onClick={() => setShowFollowing(true)}
            />
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2 mt-4">
            {isOwnProfile ? (
              <>
                <Button variant="outline" onClick={onEdit} className="flex-1 gap-1.5 rounded-full">
                  <Pencil className="w-4 h-4" />
                  プロフィール編集
                </Button>
                <Button variant="outline" onClick={onShare} size="icon" className="rounded-full shrink-0" aria-label="共有">
                  <Share2 className="w-4 h-4" />
                </Button>
              </>
            ) : user ? (
              <>
                <div className="flex-1">
                  <FollowButton userId={profile.id} />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowChat(true)}
                  className="flex-1 gap-1.5 rounded-full"
                >
                  <MessageCircle className="w-4 h-4" />
                  メッセージ
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={showFollowers} onOpenChange={setShowFollowers}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <FollowList userId={profile.id} type="followers" />
        </DialogContent>
      </Dialog>
      <Dialog open={showFollowing} onOpenChange={setShowFollowing}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <FollowList userId={profile.id} type="following" />
        </DialogContent>
      </Dialog>

      {/* 他人プロフィールのみ: メッセージモーダル */}
      {!isOwnProfile && user && (
        <ChatModal
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          partnerId={profile.id}
        />
      )}
    </>
  );
}

function StatButton({
  value,
  label,
  onClick,
}: {
  value: number;
  label: string;
  onClick?: () => void;
}) {
  const Comp = (onClick ? "button" : "div") as any;
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "flex-1 flex flex-col items-center gap-0.5 py-1 min-w-0 rounded-lg",
        onClick && "hover:bg-muted/50 transition-colors"
      )}
    >
      <span className="text-lg font-bold tabular-nums">{value.toLocaleString()}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </Comp>
  );
}
