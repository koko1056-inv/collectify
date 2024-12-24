import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CollectionTabs } from "@/components/CollectionTabs";
import { FilterBar } from "@/components/FilterBar";
import { InitialInterestSelection } from "@/components/InitialInterestSelection";
import { OfficialItem, Tag } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showInterestDialog, setShowInterestDialog] = useState(false);
  const { user } = useAuth();

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("interests")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
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

  // Enhanced sorting function that prioritizes items with user's interests
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!profile?.interests || profile.interests.length === 0) return 0;

    const aMatchCount = a.item_tags?.filter(
      itemTag => profile.interests.includes(itemTag.tags?.name || "")
    ).length || 0;
    const bMatchCount = b.item_tags?.filter(
      itemTag => profile.interests.includes(itemTag.tags?.name || "")
    ).length || 0;

    if (aMatchCount !== bMatchCount) {
      return bMatchCount - aMatchCount; // Items with more matching tags come first
    }

    // If match counts are equal, sort by creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleInterestDialogClose = () => {
    setShowInterestDialog(false);
    refetchProfile(); // Refresh profile data to get updated interests
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="space-y-6">
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            tags={allTags}
          />

          <CollectionTabs
            filteredItems={sortedItems}
            selectedTags={selectedTags}
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
    </div>
  );
};

export default Index;