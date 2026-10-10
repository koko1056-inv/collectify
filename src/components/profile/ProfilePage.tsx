import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ShareModal } from "@/components/ShareModal";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useProfileImageUpload } from "@/hooks/useProfileImageUpload";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Camera, Heart, Bookmark, Wand2 } from "lucide-react";
import { ProfileHero } from "./ProfileHero";
import { ProfileSettingsSheet } from "./ProfileSettingsSheet";
import { ProfileEditSheet } from "./ProfileEditSheet";
import { requestOnboardingRewardCheck } from "@/lib/onboardingRewards";
import { ProfileInterests } from "./interests";
import { MyStudioPanel } from "./MyStudioPanel";
import { FavoriteItemsTop5 } from "./FavoriteItemsTop5";
import { ProfileItemPosts } from "./ProfileItemPosts";
import { ProfileBookmarks } from "./ProfileBookmarks";
import { ProfileShowcase } from "./ProfileShowcase";
import { WishlistGrid } from "@/components/collection/WishlistGrid";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProfileTabs } from "./ProfileTabs";

// 自分のコレクションは下タブ①が持つので、マイページには置かない（以前は3か所に同じ一覧が出ていた）。
// 以前の「マイルーム」の AI スタジオは「AI作品」タブに入れた。
type Tab = "posts" | "wishlist" | "saved" | "ai";

const TABS: { id: Tab; labelKey: string; icon: typeof Camera }[] = [
  { id: "posts", labelKey: "profileScreen.tabs.posts", icon: Camera },
  { id: "wishlist", labelKey: "profileScreen.tabs.wishlist", icon: Heart },
  { id: "saved", labelKey: "profileScreen.tabs.saved", icon: Bookmark },
  { id: "ai", labelKey: "profileScreen.tabs.ai", icon: Wand2 },
];
const TAB_IDS = TABS.map((tab) => tab.id) as string[];

export function ProfilePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { profile, refetchProfile } = useProfile(user?.id);
  const [shareOpen, setShareOpen] = useState(false);
  // タブは ?tab= に持つ（「AI作品」などへ直接リンクできるように）。ヘッダーのメニューの「設定」は ?settings=1 で開く
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: Tab = rawTab && TAB_IDS.includes(rawTab) ? (rawTab as Tab) : "posts";
  const setActiveTab = (tab: Tab) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    if (tab !== "ai") next.delete("view");
    setSearchParams(next, { replace: true });
  };
  const settingsOpen = searchParams.get("settings") === "1";
  const setSettingsOpen = (open: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (open) next.set("settings", "1");
    else next.delete("settings");
    setSearchParams(next, { replace: true });
  };
  const [editOpen, setEditOpen] = useState(false);
  // プロフィールは refetch で読み直すので、はじめてガイドの報酬（プロフィールを整える）の確認を明示的に頼む
  const afterProfileChange = () => {
    void refetchProfile();
    requestOnboardingRewardCheck();
  };

  const {
    uploadImage,
    isUploading,
    previewUrl,
  } = useProfileImageUpload({
    userId: user?.id || "",
    onSuccess: afterProfileChange,
  });

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto pt-6 pb-nav px-4">
          <div className="max-w-3xl mx-auto space-y-4">
            <Skeleton className="h-48 w-full rounded-3xl" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-96 w-full" />
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
          {/* ヒーローカード */}
          <ProfileHero
            profile={profile}
            bio={profile.bio ?? ""}
            xUsername={profile.x_username ?? ""}
            isOwnProfile
            isUploading={isUploading}
            previewUrl={previewUrl}
            onAvatarUpload={(file) => uploadImage(file)}
            onShare={() => setShareOpen(true)}
            onEdit={() => setEditOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
          />

          {/* 推しコンテンツ */}
          <div className="px-4 mt-6">
            <ProfileInterests
              currentInterests={profile.interests || []}
              onUpdate={refetchProfile}
            />
          </div>

          {/* お気に入り TOP5（マイページにまとめたときに、自分では選べなくなっていたので戻す） */}
          <div className="mt-6">
            <FavoriteItemsTop5 userId={user.id} isOwnProfile />
          </div>

          {/* ショーケース: お気に入りルーム / アバター */}
          <ProfileShowcase
            profileId={user.id}
            isOwnProfile
            featuredRoomId={profile.featured_room_id ?? null}
            featuredAvatarId={profile.featured_avatar_id ?? null}
          />

          {/* タブナビ */}
          <div className="px-4 mt-6">
            <div data-tour="me-tabs">
            <ProfileTabs<Tab> tabs={TABS} active={activeTab} onChange={setActiveTab} />
            </div>
          </div>

          {/* タブコンテンツ */}
          <div className="mt-4">
            {activeTab === "posts" && (
              <div className="px-4">
                <div className="bg-card rounded-2xl border border-border p-5">
                  <ProfileItemPosts userId={user.id} />
                </div>
              </div>
            )}
            {activeTab === "wishlist" && (
              <div className="px-4 mt-2">
                <WishlistGrid userId={user.id} enableActions />
              </div>
            )}
            {activeTab === "saved" && <ProfileBookmarks />}
            {activeTab === "ai" && <MyStudioPanel profile={profile} />}
          </div>
        </div>
      </main>

      {/* モーダル群 */}
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title={profile.display_name || profile.username || ""}
        url={typeof window !== "undefined" ? window.location.href : ""}
        image={profile.avatar_url || "/placeholder.svg"}
        showInviteCode
      />
      <ProfileEditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
        onSaved={afterProfileChange}
      />
      <ProfileSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />

      <Footer />
    </div>
  );
}
