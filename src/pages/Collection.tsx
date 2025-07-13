import React, { useState } from "react";
import { Footer } from "@/components/Footer";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserCollection } from "@/components/UserCollection";
import { useTags } from "@/hooks/useTags";
import { useAuth } from "@/contexts/AuthContext";
import { FilterBar } from "@/components/FilterBar";
export default function Collection() {
  const isMobile = useIsMobile();
  const {
    user
  } = useAuth();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContent, setSelectedContent] = useState("");
  const {
    data: allTags = []
  } = useTags();
  return <div className="min-h-screen bg-gray-50 pb-20">
      <main className={`container mx-auto pt-4 transition-all duration-300 ${isMobile ? 'px-4 py-4' : 'px-4 py-4'}`}>
        <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
          
          
          <FilterBar searchQuery={searchQuery} onSearchChange={setSearchQuery} selectedTags={selectedTags} onTagsChange={setSelectedTags} selectedContent={selectedContent} onContentChange={setSelectedContent} tags={allTags} />
          
          <div className="transition-all duration-200">
            <UserCollection selectedTags={selectedTags} userId={user?.id || null} selectedContent={selectedContent} onContentChange={setSelectedContent} />
          </div>
        </div>
      </main>
      <Footer />
    </div>;
}