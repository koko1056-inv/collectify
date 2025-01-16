import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { CollectionLikeButton } from "@/components/collection/CollectionLikeButton";
import { ProfileCollection } from "@/components/profile/ProfileCollection";
import { ProfileWishlist } from "@/components/profile/ProfileWishlist";
import { FollowButton } from "@/components/profile/FollowButton";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { Footer } from "@/components/Footer";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Home, Search, Repeat2, ShoppingBasket, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";

const UserProfile = () => {
  const { userId } = useParams();
  const { t } = useLanguage();

  const { data: profile } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, bio")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (!profile || !userId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-4 sm:py-8 sm:pt-24">
          <p className="text-center text-gray-500">ユーザーが見つかりません</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Sidebar>
          <SidebarHeader>
            <div className="p-2">
              <Link to="/" className="logo-text">
                Collectify
              </Link>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/">
                    <Home className="h-4 w-4" />
                    <span>ホーム</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/search">
                    <Search className="h-4 w-4" />
                    <span>検索</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/trade">
                    <Repeat2 className="h-4 w-4" />
                    <span>トレード</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/wishlist">
                    <ShoppingBasket className="h-4 w-4" />
                    <span>ウィッシュリスト</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/profile">
                    <User className="h-4 w-4" />
                    <span>プロフィール</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <main className="container mx-auto px-4 py-4 sm:py-8 sm:pt-24 pb-24">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold">
                    {profile.username}
                  </h1>
                  <ProfileStats userId={userId} />
                </div>
                <div className="flex gap-2">
                  <FollowButton userId={userId} />
                  <CollectionLikeButton collectionOwnerId={userId} />
                </div>
              </div>
              {profile.bio && (
                <p className="text-gray-600 whitespace-pre-wrap">{profile.bio}</p>
              )}
            </div>

            <ProfileCollection userId={userId} />
            <ProfileWishlist userId={userId} />
          </div>
        </main>
        <Footer />
      </div>
    </SidebarProvider>
  );
};

export default UserProfile;