
import { useState } from "react";
import { CollectionTabs } from "@/components/CollectionTabs";
import { FilterBar } from "@/components/FilterBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Profile, OfficialItem, Tag } from "@/types";
import { useOfficialItems } from "@/hooks/useOfficialItems";
import { useTags } from "@/hooks/useTags";

interface UserProfileCollectionProps {
  viewedProfile: Profile | undefined;
  userId: string | null;
}

export function UserProfileCollection({ viewedProfile, userId }: UserProfileCollectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState("");
  const isMobile = useIsMobile();
  
  const { data: items = [] } = useOfficialItems();
  const { data: allTags = [] } = useTags();

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

  const sortedItems = [...filteredItems];

  return (
    <>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 px-2">
        {viewedProfile?.username}さんのコレクション
      </h1>

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

      <CollectionTabs
        filteredItems={sortedItems}
        selectedTags={selectedTags}
        userId={userId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedContent={selectedContent} 
        onContentChange={setSelectedContent}
        tags={allTags}
        onTagsChange={setSelectedTags}
      />
    </>
  );
}
