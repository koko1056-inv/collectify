import { useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserCollection } from "@/components/UserCollection";
import { useTags } from "@/hooks/useTags";
import { useAuth } from "@/contexts/AuthContext";
import { FilterBar } from "@/components/FilterBar";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CollectionLimitBanner } from "@/components/shop/CollectionLimitBanner";

export default function Collection() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContent, setSelectedContent] = useState("");
  const { data: allTags = [] } = useTags();

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleTagsChange = useCallback((tags: string[]) => {
    setSelectedTags(tags);
  }, []);

  const handleContentChange = useCallback((content: string) => {
    setSelectedContent(content);
  }, []);
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      <main className={`container mx-auto pt-20 transition-all duration-300 ${isMobile ? 'px-1 py-4' : 'px-2 py-4'}`}>
        <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
          <CollectionLimitBanner type="collection" />
          <FilterBar 
            searchQuery={searchQuery} 
            onSearchChange={handleSearchChange} 
            selectedTags={selectedTags} 
            onTagsChange={handleTagsChange} 
            selectedContent={selectedContent} 
            onContentChange={handleContentChange} 
            tags={allTags} 
          />
          
          <div className="transition-all duration-200">
            <UserCollection 
              selectedTags={selectedTags} 
              userId={user?.id || null} 
              selectedContent={selectedContent} 
              onContentChange={handleContentChange} 
            />
          </div>
        </div>
      </main>
      
      {/* モバイル用のフローティングルームボタン */}
      {isMobile && (
        <Button
          onClick={() => navigate("/rooms/explore")}
          className="fixed bottom-20 right-4 z-40 shadow-lg rounded-full w-14 h-14 p-0"
          size="icon"
        >
          <Home className="w-6 h-6" />
        </Button>
      )}
      
      <Footer />
    </div>
  );
}