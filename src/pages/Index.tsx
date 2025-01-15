import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CollectionTabs } from "@/components/CollectionTabs";
import { FilterBar } from "@/components/FilterBar";
import { InitialInterestSelection } from "@/components/InitialInterestSelection";
import { OfficialItem, Tag } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showInterestDialog, setShowInterestDialog] = useState(false);
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      return data;
    },
    enabled: !!user,
  });

  const { data: viewedProfile } = useQuery({
    queryKey: ["viewed-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        console.error("Error fetching viewed profile:", error);
        return null;
      }
      return data;
    },
    enabled: !!userId,
  });

  const { data: items = [] } = useQuery<OfficialItem[]>({
    queryKey: ["official-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_items")
        .select(`
          *,
          item_tags (
            tags (
              id,
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OfficialItem[];
    },
  });

  const { data: allTags = [] } = useQuery({
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

  useEffect(() => {
    if (user && profile && (!profile.interests || profile.interests.length === 0)) {
      setShowInterestDialog(true);
    }
  }, [user, profile]);

  const filteredItems = items.filter((item) => {
    const matchesSearch = searchQuery
      ? item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.artist?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (item.anime?.toLowerCase() || "").includes(searchQuery.toLowerCase())
      : true;
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => 
        item.item_tags?.some(itemTag => itemTag.tags?.name === tag)
      );
    
    return matchesSearch && matchesTags;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!profile?.interests || profile.interests.length === 0) return 0;

    const aMatchCount = a.item_tags?.filter(
      itemTag => profile.interests.includes(itemTag.tags?.name || "")
    ).length || 0;
    const bMatchCount = b.item_tags?.filter(
      itemTag => profile.interests.includes(itemTag.tags?.name || "")
    ).length || 0;

    if (aMatchCount !== bMatchCount) {
      return bMatchCount - aMatchCount;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleInterestDialogClose = () => {
    setShowInterestDialog(false);
    refetchProfile();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-2 py-4 pt-16 pb-24 sm:px-4 sm:py-8 sm:pt-20 sm:pb-8">
        {/* Mobile App Title */}
        <div className="flex items-center justify-center mb-4 sm:hidden">
          <span className="logo-text">Collectify</span>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {userId && viewedProfile && (
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 px-2">
              {viewedProfile.username}さんのコレクション
            </h1>
          )}

          <div className="z-10 bg-gray-50 pb-2">
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              tags={allTags}
            />
          </div>

          <CollectionTabs
            filteredItems={sortedItems}
            selectedTags={selectedTags}
            userId={userId}
          />

          {user && (
            <InitialInterestSelection
              isOpen={showInterestDialog}
              onClose={handleInterestDialogClose}
              tags={allTags}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
