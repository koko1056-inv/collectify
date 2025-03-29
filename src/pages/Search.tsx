
import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FilterBar } from "@/components/FilterBar";
import { OfficialItemsList } from "@/components/OfficialItemsList";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OfficialItem, Tag } from "@/types";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState("");
  const isMobile = useIsMobile();

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-2 py-4 pt-0 pb-24 sm:px-4 sm:py-8 sm:pt-20 sm:pb-8">
        <div className="flex items-center justify-center mb-2 sm:hidden mt-1">
          <span className="logo-text">探す</span>
        </div>

        <div className={`space-y-4 sm:space-y-6 ${isMobile ? "pt-2" : ""}`}>
          {!isMobile && (
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
          )}

          <OfficialItemsList 
            items={filteredItems}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            selectedContent={selectedContent}
            onContentChange={setSelectedContent}
            tags={allTags}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Search;
