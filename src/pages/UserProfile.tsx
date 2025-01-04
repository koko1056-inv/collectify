import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { CollectionGoodsCard } from "@/components/CollectionGoodsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { FilterBar } from "@/components/FilterBar";
import { Tag } from "@/types";
import { Button } from "@/components/ui/button";
import { Grid, List } from "lucide-react";

const UserProfile = () => {
  const { userId } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isCompact, setIsCompact] = useState(false);

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

  const { data: userItems = [], isLoading } = useQuery({
    queryKey: ["user-items", userId],
    queryFn: async () => {
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
        .eq("is_shared", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Tag[];
    },
  });

  const { data: wishlistItems = [] } = useQuery({
    queryKey: ["wishlist", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select(`
          *,
          official_items (
            title,
            image,
            price
          )
        `)
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
  });

  const filteredItems = userItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => 
        item.user_item_tags?.some(itemTag => itemTag.tags?.name === tag)
      );
    return matchesSearch && matchesTags;
  });

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8 pt-24">
          <p className="text-center text-gray-500">ユーザーが見つかりません</p>
        </main>
      </div>
    );
  }

  const gridClass = isCompact
    ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2"
    : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">
              {profile?.username}さんのコレクション
            </h1>
            {profile.bio && (
              <p className="text-gray-600 whitespace-pre-wrap">{profile.bio}</p>
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">共有アイテム</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <FilterBar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  selectedTags={selectedTags}
                  onTagsChange={setSelectedTags}
                  tags={tags}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCompact(!isCompact)}
                  className="gap-2"
                >
                  {isCompact ? (
                    <>
                      <Grid className="h-4 w-4" />
                      <span>通常表示</span>
                    </>
                  ) : (
                    <>
                      <List className="h-4 w-4" />
                      <span>一覧表示</span>
                    </>
                  )}
                </Button>
              </div>
              {isLoading ? (
                <div className={gridClass}>
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="h-[120px] w-full" />
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <p className="text-gray-500">
                  {userItems.length === 0 
                    ? "共有されているアイテムはありません"
                    : "検索条件に一致するアイテムはありません"}
                </p>
              ) : (
                <div className={gridClass}>
                  {filteredItems.map((item) => (
                    <CollectionGoodsCard
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      image={item.image}
                      isShared={item.is_shared}
                      userId={userId}
                      isCompact={isCompact}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">ウィッシュリスト</h2>
            {wishlistItems.length === 0 ? (
              <p className="text-gray-500">欲しいものリストは空です</p>
            ) : (
              <div className="grid gap-4">
                {wishlistItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 items-center border rounded-lg p-4 bg-white"
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
                        {item.official_items.price}
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
        </div>
      </main>
    </div>
  );
};

export default UserProfile;