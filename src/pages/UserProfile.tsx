import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ShareModal } from "@/components/ShareModal";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Package, Camera, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileCollection } from "@/components/profile/ProfileCollection";
import { ProfileItemPosts } from "@/components/profile/ProfileItemPosts";
import { ProfileWishlistSection } from "@/components/profile/ProfileWishlistSection";
import { Badge } from "@/components/ui/badge";

type Tab = "collection" | "posts" | "wishlist";

const TABS: { id: Tab; label: string; icon: typeof Package }[] = [
  { id: "collection", label: "コレクション", icon: Package },
  { id: "posts", label: "投稿", icon: Camera },
  { id: "wishlist", label: "ウィッシュ", icon: Heart },
];

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile(userId);
  const [activeTab, setActiveTab] = useState<Tab>("collection");
  const [shareOpen, setShareOpen] = useState(false);

  const isOwnProfile = user?.id === userId;

  // 推しコンテンツ
  const interests = profile?.interests || [];

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/search?tab=friends");
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto pb-20 px-4 pt-6">
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
          {/* 戻るボタン */}
          <div className="px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="gap-1 text-muted-foreground hover:text-foreground -ml-2"
            >
              <ArrowLeft className="w-4 h-4" />
              戻る
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

          {/* 推しコンテンツ (読み取り専用) */}
          {interests.length > 0 && (
            <div className="px-4 mt-4">
              <h3 className="text-sm font-semibold mb-2">推しコンテンツ</h3>
              <div className="flex flex-wrap gap-1.5">
                {interests.map((name: string) => (
                  <Badge key={name} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    #{name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* タブ */}
          <div className="px-4 mt-6">
            <div className="relative flex p-1 rounded-full bg-muted/60 border border-border/30">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full text-sm font-medium transition-colors z-10",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs sm:text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </div>
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
              <div className="px-4">
                <ProfileWishlistSection userId={userId} />
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
