import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FilterBar } from "@/components/FilterBar";
import { OfficialItemsList } from "@/components/OfficialItemsList";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOfficialItems } from "@/hooks/useOfficialItems";
import { useTags } from "@/hooks/useTags";
import { useState } from "react";
const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState("");
  const isMobile = useIsMobile();
  const {
    data: items = []
  } = useOfficialItems();
  const {
    data: allTags = []
  } = useTags();
  const filteredItems = items.filter(item => {
    const matchesSearch = searchQuery ? item.title.toLowerCase().includes(searchQuery.toLowerCase()) || (item.artist?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || (item.anime?.toLowerCase() || "").includes(searchQuery.toLowerCase()) : true;
    const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => item.item_tags?.some(itemTag => itemTag.tags?.name === tag));
    const matchesContent = !selectedContent || selectedContent === "all" || item.content_name === selectedContent;
    return matchesSearch && matchesTags && matchesContent;
  });
  return <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-2 pt-28 pb-24 sm:px-4 sm:py-8 sm:pb-8 py-[60px]">
        <div className={`space-y-4 sm:space-y-6 ${isMobile ? "pt-2" : ""}`}>
          {!isMobile && <div className={`z-10 bg-gray-50 ${isMobile ? "sticky top-0 pb-0" : "pb-2"}`}>
              <FilterBar searchQuery={searchQuery} onSearchChange={setSearchQuery} selectedTags={selectedTags} onTagsChange={setSelectedTags} selectedContent={selectedContent} onContentChange={setSelectedContent} tags={allTags} />
            </div>}

          <OfficialItemsList items={filteredItems} searchQuery={searchQuery} onSearchChange={setSearchQuery} selectedTags={selectedTags} onTagsChange={setSelectedTags} selectedContent={selectedContent} onContentChange={setSelectedContent} tags={allTags} />
        </div>
      </main>
      <Footer />
    </div>;
};
export default Search;