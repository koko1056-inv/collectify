import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { CollectionLikeButton } from "@/components/collection/CollectionLikeButton";
import { ProfileCollection } from "@/components/profile/ProfileCollection";
import { ProfileWishlist } from "@/components/profile/ProfileWishlist";

const UserProfile = () => {
  const { userId } = useParams();

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
        <main className="container mx-auto px-4 py-8 pt-24">
          <p className="text-center text-gray-500">ユーザーが見つかりません</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">
                {profile.username}さんのコレクション
              </h1>
              <CollectionLikeButton collectionOwnerId={userId} />
            </div>
            {profile.bio && (
              <p className="text-gray-600 whitespace-pre-wrap">{profile.bio}</p>
            )}
          </div>

          <ProfileCollection userId={userId} />
          <ProfileWishlist userId={userId} />
        </div>
      </main>
    </div>
  );
};

export default UserProfile;