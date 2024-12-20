import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchBar } from "@/components/SearchBar";
import { CollectionTabs } from "@/components/CollectionTabs";
import { TagFilter } from "@/components/TagFilter";
import { OfficialItem, Tag } from "@/types";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["official-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_items")
        .select(`
          *,
          item_tags (
            tag_id,
            tags (
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

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedTag) {
      const itemTags = item.item_tags?.map(
        (itemTag) => itemTag.tags?.name
      ) || [];
      return matchesSearch && itemTags.includes(selectedTag);
    }
    
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTag={selectedTag}
            onTagSelect={setSelectedTag}
            tags={allTags}
          />

          <TagFilter
            selectedTag={selectedTag}
            onTagSelect={setSelectedTag}
            tags={allTags}
          />

          <CollectionTabs
            filteredItems={filteredItems}
            selectedTag={selectedTag}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;