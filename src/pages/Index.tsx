import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FilterBar } from "@/components/FilterBar";
import { CollectionTabs } from "@/components/CollectionTabs";
import { OfficialItem, Tag } from "@/types";

export default function Index() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedAnime, setSelectedAnime] = useState<string | null>(null);

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
      return data as OfficialItem[];
    },
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("is_category", false)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Tag[];
    },
  });

  const { data: artists = [] } = useQuery({
    queryKey: ["artists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_items")
        .select("artist")
        .not("artist", "is", null)
        .order("artist", { ascending: true });

      if (error) throw error;
      const uniqueArtists = [...new Set(data.map(item => item.artist))];
      return uniqueArtists.filter(Boolean) as string[];
    },
  });

  const { data: animes = [] } = useQuery({
    queryKey: ["animes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_items")
        .select("anime")
        .not("anime", "is", null)
        .order("anime", { ascending: true });

      if (error) throw error;
      const uniqueAnimes = [...new Set(data.map(item => item.anime))];
      return uniqueAnimes.filter(Boolean) as string[];
    },
  });

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || item.item_tags?.some(tag => tag.tags?.name === selectedTag);
    const matchesArtist = !selectedArtist || item.artist === selectedArtist;
    const matchesAnime = !selectedAnime || item.anime === selectedAnime;
    return matchesSearch && matchesTag && matchesArtist && matchesAnime;
  });

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTag={selectedTag}
        onTagSelect={setSelectedTag}
        tags={tags}
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
        onArtistSelect={setSelectedArtist}
        onAnimeSelect={setSelectedAnime}
      />
    </div>
  );
}