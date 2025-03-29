
import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserCollection } from "@/components/UserCollection";
import { FilterBar } from "@/components/FilterBar";
import { useTags } from "@/hooks/useTags";

export default function Collection() {
  const isMobile = useIsMobile();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContent, setSelectedContent] = useState("");

  const { data: allTags = [] } = useTags();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      <main className={`container mx-auto ${isMobile ? 'px-4 py-8' : 'px-4 py-8 pt-24'}`}>
        <div className="flex items-center justify-center mb-6 sm:mb-8 mt-4">
          <span className="logo-text text-2xl font-bold">Collectify</span>
        </div>
        
        <div className="max-w-3xl mx-auto space-y-6">
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            selectedContent={selectedContent}
            onContentChange={setSelectedContent}
            tags={allTags}
          />
          
          <UserCollection
            selectedTags={selectedTags}
            userId={null}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
