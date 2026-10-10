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
import { Package, Camera, Heart, Bookmark } from "lucide-react";
import { ProfileHero } from "./ProfileHero";
import { ProfileSettingsSheet } from "./ProfileSettingsSheet";
import { ProfileEditSheet } from "./ProfileEditSheet";
import { ProfileInterests } from "./interests";
import { ProfileCollection } from "./ProfileCollection";
import { ProfileItemPosts } from "./ProfileItemPosts";
import { ProfileBookmarks } from "./ProfileBookmarks";
import { ProfileShowcase } from "./ProfileShowcase";
import { WishlistGrid } from "@/components/collection/WishlistGrid";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProfileTabs } from "./ProfileTabs";

type Tab = "collection" | "posts" | "wishlist" | "saved";

const TABS: { id: Tab; labelKey: string; icon: typeof Package }[] = [
  { id: "collection", labelKey: "profileScreen.tabs.collection", icon: Package },
  { id: "posts", labelKey: "profileScreen.tabs.posts", icon: Camera },
  { id: "wishlist", labelKey: "profileScreen.tabs.wishlist", icon: Heart },
  { id: "saved", labelKey: "profileScreen.tabs.saved", icon: Bookmark },
];

export function ProfilePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { profile, refetchProfile } = useProfile(user?.id);
  const [activeTab, setActiveTab] = useState<Tab>("collection");
  const [shareOpen, setShareOpen] = useState(false);
  // ヘッダーのメニューの「設定」は /edit-profile?settings=1 で開く
  const [searchParams, setSearchParams] = useSearchParams();
  const settingsOpen = searchParams.get("settings") === "1";
  const setSettingsOpen = (open: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (open) next.set("settings", "1");
    else next.delete("settings");
    setSearchParams(next, { replace: true });
  };
  const [editOpen, setEditOpen] = useState(false);

  const {
    uploadImage,
    isUploading,
    previewUrl,
  } = useProfileImageUpload({
    userId: user?.id || "",
    onSuccess: () => refetchProfile(),
  });

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto pt-6 pb-20 px-4">
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
      <main className="w-full pb-24">
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

          {/* ショーケース: お気に入りルーム / アバター */}
          <ProfileShowcase
            profileId={user.id}
            isOwnProfile
            featuredRoomId={profile.featured_room_id ?? null}
            featuredAvatarId={profile.featured_avatar_id ?? null}
          />

          {/* タブナビ */}
          <div className="px-4 mt-6">
            <ProfileTabs<Tab> tabs={TABS} active={activeTab} onChange={setActiveTab} />
          </div>

          {/* タブコンテンツ */}
          <div className="mt-4">
            {activeTab === "collection" && (
              <ProfileCollection userId={user.id} />
            )}
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
        onSaved={refetchProfile}
      />
      <ProfileSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />

      <Footer />
    </div>
  );
}
