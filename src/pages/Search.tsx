
import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FilterBar } from "@/components/FilterBar";
import { SlideFilterBar } from "@/components/SlideFilterBar";
import { OfficialItemsList } from "@/components/OfficialItemsList";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOfficialItems } from "@/hooks/useOfficialItems";
import { useTags } from "@/hooks/useTags";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState("");
  const location = useLocation();
  const isMobile = useIsMobile();
  const {
    data: items = []
  } = useOfficialItems();
  const {
    data: allTags = []
  } = useTags();

  // URLクエリパラメータを処理
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const itemId = searchParams.get('item');
    
    if (itemId && items.length > 0) {
      // 指定されたアイテムを検索して、そのタイトルを検索クエリにセット
      const targetItem = items.find(item => item.id === itemId);
      if (targetItem) {
        setSearchQuery(targetItem.title);
      }
    }
  }, [location.search, items]);

  const filteredItems = items.filter(item => {
    const matchesSearch = searchQuery ? item.title.toLowerCase().includes(searchQuery.toLowerCase()) || (item.artist?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || (item.anime?.toLowerCase() || "").includes(searchQuery.toLowerCase()) : true;
    const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => item.item_tags?.some(itemTag => itemTag.tags?.name === tag));
    const matchesContent = !selectedContent || selectedContent === "all" || item.content_name === selectedContent;
    return matchesSearch && matchesTags && matchesContent;
  });
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-2 pt-32 pb-24 sm:px-4 sm:pt-24 sm:pb-8">
        <div className={`space-y-4 sm:space-y-6 ${isMobile ? "pt-2" : ""}`}>
          {!isMobile && (
            <>
              <SlideFilterBar
                selectedContent={selectedContent}
                onContentChange={setSelectedContent}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                tags={allTags}
              />
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
            </>
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
