
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OfficialItemsList } from "@/components/OfficialItemsList";
import { UserCollection } from "@/components/UserCollection";
import { OfficialItem } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { trackTabChange } from "@/utils/analytics";
import { useState } from "react";
import { SearchBar } from "@/components/SearchBar";

interface CollectionTabsProps {
  filteredItems: OfficialItem[];
  selectedTags: string[];
  userId?: string | null;
}

export function CollectionTabs({ filteredItems, selectedTags, userId }: CollectionTabsProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  
  // 検索に基づいて公式アイテムをフィルタリング
  const searchFilteredItems = searchQuery 
    ? filteredItems.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredItems;

  const handleTabChange = (value: string) => {
    trackTabChange(value, user?.id);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <Tabs defaultValue="official" className="space-y-4 sm:space-y-6" onValueChange={handleTabChange}>
      <TabsList className="grid w-full max-w-[280px] mx-auto grid-cols-2 bg-white border border-gray-200 rounded-full">
        <TabsTrigger 
          value="official" 
          className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full"
        >
          {t("tabs.official")}
        </TabsTrigger>
        <TabsTrigger 
          value="collection" 
          className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full"
        >
          {t("tabs.collection")}
        </TabsTrigger>
      </TabsList>
      
      <div className="mt-2 sm:mt-4">
        <SearchBar 
          searchQuery={searchQuery} 
          onSearchChange={handleSearchChange}
          selectedTags={[]} 
          onTagsChange={() => {}} 
          tags={[]}
        />
      </div>

      <TabsContent value="official" className="mt-2 sm:mt-4">
        <OfficialItemsList items={searchFilteredItems} />
      </TabsContent>

      <TabsContent value="collection" className="mt-2 sm:mt-4">
        <div className="space-y-6">
          <UserCollection 
            selectedTags={selectedTags} 
            userId={userId} 
            searchQuery={searchQuery} 
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}
