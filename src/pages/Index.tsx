import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CollectionTabs } from "@/components/CollectionTabs";
import { FilterBar } from "@/components/FilterBar";
import { OfficialItem, Tag } from "@/types";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedAnime, setSelectedAnime] = useState<string | null>(null);

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

  // Extract unique artists and animes from items
  const artists = Array.from(new Set(items.map(item => item.artist).filter(Boolean))).sort();
  const animes = Array.from(new Set(items.map(item => item.anime).filter(Boolean))).sort();

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag
      ? item.item_tags?.some(itemTag => itemTag.tags?.name === selectedTag)
      : true;
    const matchesArtist = selectedArtist
      ? item.artist === selectedArtist
      : true;
    const matchesAnime = selectedAnime
      ? item.anime === selectedAnime
      : true;
    
    return matchesSearch && matchesTag && matchesArtist && matchesAnime;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="space-y-6">
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTag={selectedTag}
            onTagSelect={setSelectedTag}
            tags={allTags}
            selectedArtist={selectedArtist}
            onArtistSelect={setSelectedArtist}
            selectedAnime={selectedAnime}
            onAnimeSelect={setSelectedAnime}
            artists={artists}
            animes={animes}
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