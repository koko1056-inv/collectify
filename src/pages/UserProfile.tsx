import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareModal } from "@/components/ShareModal";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileBio } from "@/components/profile/ProfileBio";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { FollowButton } from "@/components/profile/FollowButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WishlistViewModal } from "@/components/WishlistViewModal";
import { useQuery } from "@tanstack/react-query";
import { CollectionGrid } from "@/components/collection/CollectionGrid";

export default function UserProfile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [selectedWishlistItem, setSelectedWishlistItem] = useState<any>(null);

  const { data: userItems = [] } = useQuery({
    queryKey: ["user-items", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_items")
        .select(`
          *,
          user_item_tags (
            tags (
              id,
              name
            )
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const { data: wishlistItems = [] } = useQuery({
    queryKey: ["wishlist", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("wishlists")
        .select(`
          *,
          official_items (
            id,
            title,
            image,
            price,
            release_date,
            description
          )
        `)
        .eq("user_id", userId);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        toast({
          variant: "destructive",
          title: "エラー",
          description: "プロフィールの取得に失敗しました",
        });
        return;
      }

      setBio(profile.bio || "");
      setUsername(profile.username || "");
      setLoading(false);
    };

    fetchProfile();
  }, [userId, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="max-w-3xl mx-auto space-y-8">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-8 w-32" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-6">
              <ProfileHeader 
                username={username}
                onShare={() => setIsShareModalOpen(true)}
              />
              {user && user.id !== userId && (
                <FollowButton userId={userId} />
              )}
            </div>

            <ProfileStats userId={userId} />

            <div className="mt-6">
              <ProfileBio
                bio={bio}
                isEditing={false}
                saving={false}
                onBioChange={() => {}}
                onEdit={() => {}}
                onCancel={() => {}}
                onSubmit={() => {}}
                isOwnProfile={false}
              />
            </div>
          </div>

          <Tabs defaultValue="collection" className="w-full">
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

            <TabsContent value="collection" className="mt-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <CollectionGrid
                  items={userItems}
                  isCompact={false}
                  isSelectionMode={false}
                  selectedItems={[]}
                  onSelectItem={() => {}}
                  onDragEnd={() => {}}
                />
              </div>
            </TabsContent>

            <TabsContent value="wishlist" className="mt-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">ウィッシュリスト</h2>
                {wishlistItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    ウィッシュリストは空です
                  </p>
                ) : (
                  <div className="grid gap-4">
                    {wishlistItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-4 items-center border rounded-lg p-4 bg-white cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          setSelectedWishlistItem(item);
                          setIsWishlistModalOpen(true);
                        }}
                      >
                        <img
                          src={item.official_items.image}
                          alt={item.official_items.title}
                          className="h-24 w-24 object-cover rounded-md"
                        />
                        <div>
                          <h3 className="font-medium">
                            {item.official_items.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {item.official_items.price}円
                          </p>
                          {item.note && (
                            <p className="text-sm text-gray-500 mt-2">
                              メモ: {item.note}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={`${username}のプロフィール`}
        url={window.location.href}
        image="/placeholder.svg"
      />

      {selectedWishlistItem && (
        <WishlistViewModal
          isOpen={isWishlistModalOpen}
          onClose={() => {
            setIsWishlistModalOpen(false);
            setSelectedWishlistItem(null);
          }}
        />
      )}

      <Footer />
    </div>
  );
}