import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CollectionTabs } from "@/components/CollectionTabs";
import { FilterBar } from "@/components/FilterBar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Tag } from "@/types";

const Collection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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
      return data as Tag[];
    },
  });

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-2 py-4 pt-0 pb-24 sm:px-4 sm:py-8 sm:pt-20 sm:pb-8">
        <div className="space-y-4 sm:space-y-6">
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
            filteredItems={filteredItems}
            selectedTags={selectedTags}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Collection;