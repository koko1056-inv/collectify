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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";

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
        <main className="container mx-auto px-4 py-4">
          <p className="text-center text-gray-500">ユーザーが見つかりません</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-2 sm:py-8 sm:pt-24 pb-20">
        <div className="space-y-4 sm:space-y-8">
          <div className="space-y-2 sm:space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1 sm:space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold">
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
              <p className="text-gray-600 text-sm sm:text-base whitespace-pre-wrap">{profile.bio}</p>
            )}
          </div>

          <Tabs defaultValue="collection" className="space-y-3 sm:space-y-4">
            <TabsList className="grid w-full max-w-[280px] mx-auto grid-cols-2 bg-white border border-gray-200 rounded-full">
              <TabsTrigger 
                value="collection" 
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full"
              >
                コレクション
              </TabsTrigger>
              <TabsTrigger 
                value="wishlist" 
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full"
              >
                ウィッシュリスト
              </TabsTrigger>
            </TabsList>
            <TabsContent value="collection">
              <ProfileCollection userId={userId} selectedTags={[]} />
            </TabsContent>
            <TabsContent value="wishlist">
              <ProfileWishlist userId={userId} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UserProfile;