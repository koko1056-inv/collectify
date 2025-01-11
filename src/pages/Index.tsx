import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CollectionTabs } from "@/components/CollectionTabs";
import { FilterBar } from "@/components/FilterBar";
import { InitialInterestSelection } from "@/components/InitialInterestSelection";
import { useAuth } from "@/contexts/AuthContext";
import { useFilteredItems } from "@/hooks/collection/useFilteredItems";

const Index = () => {
  const [showInterestDialog, setShowInterestDialog] = useState(false);
  const { user } = useAuth();

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

  const { data: items = [] } = useQuery({
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
      return data;
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
      return data;
    },
  });

  const {
    searchQuery,
    selectedTags,
    setSearchQuery,
    setSelectedTags,
    sortedItems,
  } = useFilteredItems(items, profile?.interests);

  useEffect(() => {
    if (user && profile && (!profile.interests || profile.interests.length === 0)) {
      setShowInterestDialog(true);
    }
  }, [user, profile]);

  const handleInterestDialogClose = () => {
    setShowInterestDialog(false);
    refetchProfile();
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
}

export default Index;