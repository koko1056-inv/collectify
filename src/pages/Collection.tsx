
import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserCollection } from "@/components/UserCollection";
import { useTags } from "@/hooks/useTags";
import { useAuth } from "@/contexts/AuthContext";
import { FilterBar } from "@/components/FilterBar";

export default function Collection() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContent, setSelectedContent] = useState("");

  const { data: allTags = [] } = useTags();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      <main className={`container mx-auto pt-28 ${isMobile ? 'px-4 py-8' : 'px-4 py-8'}`}>
        <div className="max-w-5xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold text-center mb-6">マイコレクション</h1>
          
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
            userId={user?.id || null}
            selectedContent={selectedContent}
            onContentChange={setSelectedContent}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
