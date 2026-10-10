import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Gem,
  Trophy,
  Medal,
  Sprout,
  Share2,
  Settings,
  Pencil,
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
import { useLanguage } from "@/contexts/LanguageContext";
import { ReportBlockMenu } from "@/components/safety/ReportBlockMenu";
import { IconTile, type IconTileTone } from "@/components/ui/icon-tile";

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
}: ProfileHeroProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const handleCoverUpload = async (file: File) => {
    if (!isOwnProfile || !user?.id) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("profileScreen.hero.coverTooLarge"));
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error(t("profileScreen.hero.coverType"));
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
      toast.success(t("profileScreen.hero.coverUpdated"));
    } catch (e) {
      console.error("Cover upload error:", e);
      toast.error(t("profileScreen.hero.uploadFailed"));
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

  // ランク（登録数で決まる）。
  // 以前はランクごとに虹色のグラデーション（cyan→blue、amber→orange、pink→purple…）を
  // カバー全面・アバターの光・ピン・名前の横の札の4か所に塗っていて、画面が子どもっぽく見えていた。
  // いまは名前の横の小さな印（IconTile）と文字だけで示し、色は意味のトークンから選ぶ。
  const rank: { label: string; icon: typeof Gem; tone: IconTileTone } = (() => {
    const n = stats?.items ?? 0;
    // 登録したばかり（Rookie）は控えめな muted。上がるほど色が付く
    if (n >= 500) return { label: "Diamond", icon: Gem, tone: "primary" };
    if (n >= 200) return { label: "Gold", icon: Trophy, tone: "points" };
    if (n >= 50) return { label: "Silver", icon: Medal, tone: "info" };
    if (n >= 10) return { label: "Bronze", icon: Medal, tone: "warning" };
    return { label: "Rookie", icon: Sprout, tone: "muted" };
  })();
  const RankIcon = rank.icon;


  const displayName = profile.display_name || profile.username || t("profileScreen.hero.defaultName");
  const avatarSrc = previewUrl || profile.avatar_url || undefined;
  const coverSrc = coverPreview || profile.cover_image_url || null;
  const hasCustomCover = !!coverSrc;
  // カバーの上のボタン。写真のカバーでは暗い半透明（白い印）、無地のカバーでは明るい面（文字色の印）にする
  const coverButton = hasCustomCover
    ? "bg-black/30 hover:bg-black/50 text-white"
    : "bg-background/70 hover:bg-background/90 text-foreground ring-1 ring-inset ring-foreground/5";

  return (
    <>
      <div className="relative overflow-hidden rounded-b-3xl sm:rounded-3xl">
        {/* カバー: カスタム画像 or 無地。
            無地のときは primary をごく薄く敷き、細かな点の地模様と上からのやわらかな光だけを置く。
            以前はランク色のグラデーションの上に ✨💖🌸⭐🎀 の絵文字が浮遊していた */}
        <div
          className={cn(
            "relative h-32 sm:h-44 overflow-hidden",
            !hasCustomCover && "bg-primary/10 dark:bg-primary/15"
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
            <>
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.22) 1px, transparent 0)",
                  backgroundSize: "14px 14px",
                  maskImage: "linear-gradient(to bottom, black, transparent 85%)",
                  WebkitMaskImage: "linear-gradient(to bottom, black, transparent 85%)",
                }}
              />
              {/* 上からのやわらかな光。ライトでは白っぽく明るく、ダークでは primary を少しだけ灯す */}
              <div
                aria-hidden="true"
                className="absolute inset-0 dark:hidden"
                style={{
                  backgroundImage: "radial-gradient(90% 120% at 50% 0%, hsl(var(--background) / 0.55), transparent 70%)",
                }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 hidden dark:block"
                style={{
                  backgroundImage: "radial-gradient(90% 120% at 50% 0%, hsl(var(--primary) / 0.14), transparent 70%)",
                }}
              />
            </>
          )}

          {/* 44px は Apple の指針の下限。ログアウトが隣にあるので、
                当たり判定を広げるのではなく実サイズを上げ、隙間も確保する */}
          <div className="absolute top-3 right-3 flex gap-2 z-10">
            {isOwnProfile && (
              <label
                className={cn(
                  "w-11 h-11 rounded-full backdrop-blur-sm flex items-center justify-center cursor-pointer transition-colors",
                  coverButton,
                  coverUploading && "pointer-events-none opacity-70"
                )}
                aria-label={t("profileScreen.hero.changeCover")}
                title={t("profileScreen.hero.changeCover")}
              >
                {coverUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ImagePlus className="w-5 h-5" />
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
            {/* ログアウトはワンタップで確認なしに実行されていたので、ここには置かない（設定の最下部にある） */}
            {isOwnProfile ? (
              onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className={cn("w-11 h-11 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors", coverButton)}
                  aria-label={t("profileScreen.hero.settings")}
                >
                  <Settings className="w-5 h-5" />
                </button>
              )
            ) : (
              <button
                onClick={onShare}
                className={cn("w-11 h-11 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors", coverButton)}
                aria-label={t("profileScreen.hero.share")}
              >
                <Share2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* 本体カード */}
        <div className="bg-card pt-14 px-4 sm:px-6 pb-4">
          {/* アバター (カバーに半分かぶる) */}
          <div className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0">
            <label className={cn("relative block group", isOwnProfile && !isUploading && "cursor-pointer")}>
              {/* 以前はアバターの後ろでランク色の光が脈打ち、右下にもランクのピンが付いていた。
                  ランクは名前の横に1つだけ出す */}
              <Avatar className="relative w-24 h-24 sm:w-28 sm:h-28 border-4 border-card bg-card shadow-md">
                <AvatarImage src={avatarSrc} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
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
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <IconTile tone={rank.tone} size="xs">
                  <RankIcon />
                </IconTile>
                {rank.label}
              </span>
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
            <StatButton value={stats?.items ?? 0} label={t("profileScreen.hero.statItems")} />
            <div className="w-px h-8 bg-border" />
            <StatButton
              value={stats?.followers ?? 0}
              label={t("profileScreen.follow.followers")}
              onClick={() => setShowFollowers(true)}
            />
            <div className="w-px h-8 bg-border" />
            <StatButton
              value={stats?.following ?? 0}
              label={t("profileScreen.follow.following")}
              onClick={() => setShowFollowing(true)}
            />
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2 mt-4">
            {isOwnProfile ? (
              <>
                {onEdit && (
                  <Button variant="outline" onClick={onEdit} className="flex-1 gap-1.5 rounded-full" data-tour="me-edit">
                    <Pencil className="w-4 h-4" />
                    {t("profileScreen.editSheet.title")}
                  </Button>
                )}
                <Button variant="outline" onClick={onShare} size="icon" className="rounded-full shrink-0" aria-label={t("profileScreen.hero.share")}>
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
                  {t("profileScreen.hero.message")}
                </Button>
                <ReportBlockMenu
                  targetType="profile"
                  targetId={profile.id}
                  ownerId={profile.id}
                  ownerName={profile.display_name || profile.username}
                  triggerClassName="h-10 w-10 rounded-full border border-input"
                />
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
      <span className="text-3xs text-muted-foreground">{label}</span>
    </Comp>
  );
}
