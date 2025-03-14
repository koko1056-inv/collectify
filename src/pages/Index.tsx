
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CollectionTabs } from "@/components/CollectionTabs";
import { FilterBar } from "@/components/FilterBar";
import { InitialInterestSelection } from "@/components/InitialInterestSelection";
import { OfficialItem, Tag, Profile } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState("");
  const [showInterestDialog, setShowInterestDialog] = useState(false);
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");
  const isMobile = useIsMobile();

  const { data: profile, refetch: refetchProfile } = useQuery<Profile>({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not found");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      if (!data) throw new Error("Profile not found");
      return data as Profile;
    },
    enabled: !!user,
  });

  const { data: viewedProfile } = useQuery<Profile>({
    queryKey: ["viewed-profile", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID not provided");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;
      if (!data) throw new Error("Profile not found");
      return data as Profile;
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
      return data.map(item => ({
        ...item,
        artist: null,
        anime: null
      })) as OfficialItem[];
    },
  });

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
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
    
    const matchesContent = !selectedContent || selectedContent === "all" || item.content_name === selectedContent;
    
    return matchesSearch && matchesTags && matchesContent;
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
      <main className="container mx-auto px-2 py-4 pt-0 pb-24 sm:px-4 sm:py-8 sm:pt-20 sm:pb-8">
        <div className="flex items-center justify-center mb-2 sm:hidden mt-1">
          <span className="logo-text">Collectify</span>
        </div>

        <div className={`space-y-4 sm:space-y-6 ${isMobile ? "pt-2" : ""}`}>
          {userId && viewedProfile && (
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 px-2">
              {viewedProfile.username}さんのコレクション
            </h1>
          )}

          <div className={`z-10 bg-gray-50 ${isMobile ? "sticky top-0 pb-0" : "pb-2"}`}>
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              selectedContent={selectedContent}
              onContentChange={setSelectedContent}
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
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
