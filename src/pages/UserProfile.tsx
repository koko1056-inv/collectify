import { useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ShareModal } from "@/components/ShareModal";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Package, Camera, Heart, ShieldCheck, UserX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { cn } from "@/lib/utils";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { FavoriteItemsCircleStrip } from "@/components/profile/FavoriteItemsCircleStrip";
import { ProfileCollection } from "@/components/profile/ProfileCollection";
import { ProfileItemPosts } from "@/components/profile/ProfileItemPosts";
import { ProfileShowcase } from "@/components/profile/ProfileShowcase";
import { WishlistGrid } from "@/components/collection/WishlistGrid";
import { Badge } from "@/components/ui/badge";
import { TrustBadge } from "@/features/trust/TrustBadge";
import { TrustScoreSection } from "@/features/trust/TrustScoreSection";
import { StampSendButton } from "@/features/stamps/StampSendButton";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { useBlockedUserIds, useBlockedUsers, useUnblockUser } from "@/hooks/useBlocks";

type Tab = "collection" | "posts" | "wishlist" | "trust";

// label は翻訳キー。モジュールスコープでは useLanguage が使えないため、描画時に t() で解決する。
const TABS: { id: Tab; label: string; icon: typeof Package }[] = [
  { id: "collection", label: "screens.userProfile.tabCollection", icon: Package },
  { id: "posts", label: "screens.userProfile.tabPosts", icon: Camera },
  { id: "wishlist", label: "screens.userProfile.tabWishlist", icon: Heart },
  { id: "trust", label: "screens.userProfile.tabTrust", icon: ShieldCheck },
];

export default function UserProfile() {
  const { t } = useLanguage();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, error: profileError, isNotFound, refetchProfile } = useProfile(userId);
  const [activeTab, setActiveTab] = useState<Tab>("collection");
  const [shareOpen, setShareOpen] = useState(false);

  const isOwnProfile = user?.id === userId;

  // ブロックの関係にある相手のプロフィールは見せない
  const { isBlocked } = useBlockedUserIds();
  const { data: myBlocks = [] } = useBlockedUsers();
  const unblock = useUnblockUser();

  // 推しコンテンツ
  const interests = profile?.interests || [];

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/explore?tab=users");
  };

  // 自分の id で開いたら、自分のプロフィール画面へ（ここでは設定・編集・ログアウトが動かない）
  if (user && userId === user.id) {
    return <Navigate to="/me" replace />;
  }

  if (!profile) {
    // 読み込み中・存在しない・読み込み失敗を分ける（以前は永遠にスケルトンのままだった）
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto pb-nav px-4 pt-6">
          {isNotFound ? (
            <EmptyState
              icon={UserX}
              title={t("screens.userProfile.notFoundTitle")}
              description={t("screens.userProfile.notFoundDesc")}
              action={
                <Button onClick={() => navigate("/explore?tab=users")}>{t("screens.userProfile.toExplore")}</Button>
              }
            />
          ) : profileError ? (
            <QueryErrorState
              title={t("screens.userProfile.loadError")}
              onRetry={() => void refetchProfile()}
            />
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              <Skeleton className="h-48 w-full rounded-3xl" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  if (!isOwnProfile && isBlocked(profile.id)) {
    const iBlockedThem = myBlocks.some((b) => b.blocked_id === profile.id);
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto pb-nav px-4 pt-6">
          <div className="max-w-md mx-auto text-center space-y-3 py-16">
            <p className="font-medium">{t("safety.blocked.unavailableTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("safety.blocked.unavailableDesc")}</p>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                {t("screens.userProfile.back")}
              </Button>
              {iBlockedThem && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={unblock.isPending}
                  onClick={() => unblock.mutate({ userId: profile.id })}
                >
                  {t("safety.blocked.unavailableUnblock")}
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="w-full pb-nav">
        <div className="max-w-3xl mx-auto">
          {/* 戻るボタン */}
          <div className="px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="gap-1 text-muted-foreground hover:text-foreground -ml-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("screens.userProfile.back")}
            </Button>
          </div>

          {/* ヒーロー */}
          <ProfileHero
            profile={profile}
            bio={profile.bio ?? ""}
            xUsername={profile.x_username ?? ""}
            isOwnProfile={isOwnProfile}
            onShare={() => setShareOpen(true)}
          />

          {/* 推し（お気に入りグッズ）を丸アイコンで横並び表示 */}
          {userId && <FavoriteItemsCircleStrip userId={userId} />}

          {/* 信頼バッジ＆スタンプ送信 */}
          {userId && (
            <div className="px-4 mt-3 flex items-center gap-2 flex-wrap">
              <TrustBadge userId={userId} size="md" />
              {!isOwnProfile && user && (
                <StampSendButton
                  receiverId={userId}
                  contextType="profile"
                  contextId={userId}
                />
              )}
            </div>
          )}

          {/* 推しコンテンツ (読み取り専用) */}
          {interests.length > 0 && (
            <div className="px-4 mt-4">
              <h3 className="text-sm font-bold mb-2">{t("screens.userProfile.favoriteContent")}</h3>
              <div className="flex flex-wrap gap-1.5">
                {interests.map((name: string) => (
                  <Badge key={name} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    #{name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* ショーケース: お気に入りルーム / アバター */}
          {userId && (
            <ProfileShowcase
              profileId={userId}
              isOwnProfile={isOwnProfile}
              featuredRoomId={profile.featured_room_id ?? null}
              featuredAvatarId={profile.featured_avatar_id ?? null}
            />
          )}

          {/* タブ */}
          <div className="px-4 mt-6">
            <ProfileTabs<Tab>
              tabs={TABS.map((tab) => ({ id: tab.id, labelKey: tab.label, icon: tab.icon }))}
              active={activeTab}
              onChange={setActiveTab}
            />
          </div>

          {/* タブコンテンツ */}
          <div className="mt-4">
            {activeTab === "collection" && userId && (
              <ProfileCollection userId={userId} />
            )}
            {activeTab === "posts" && userId && (
              <div className="px-4">
                <div className="bg-card rounded-2xl border border-border p-5">
                  <ProfileItemPosts userId={userId} />
                </div>
              </div>
            )}
            {activeTab === "wishlist" && userId && (
              <div className="px-4 mt-2">
                <WishlistGrid userId={userId} enableActions={isOwnProfile} />
              </div>
            )}
            {activeTab === "trust" && userId && (
              <div className="px-4 mt-2">
                <TrustScoreSection userId={userId} />
              </div>
            )}
          </div>
        </div>
      </main>

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title={profile.display_name || profile.username || ""}
        url={typeof window !== "undefined" ? window.location.href : ""}
        image={profile.avatar_url || "/placeholder.svg"}
        showInviteCode={isOwnProfile}
      />

      <Footer />
    </div>
  );
}
