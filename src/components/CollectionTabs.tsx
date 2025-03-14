
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OfficialItemsList } from "@/components/OfficialItemsList";
import { UserCollection } from "@/components/UserCollection";
import { OfficialItem, Tag } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { trackTabChange } from "@/utils/analytics";

interface CollectionTabsProps {
  filteredItems: OfficialItem[];
  selectedTags: string[];
  userId?: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedContent: string;
  onContentChange: (content: string) => void;
  tags: Tag[];
}

export function CollectionTabs({ 
  filteredItems, 
  selectedTags, 
  userId,
  searchQuery,
  onSearchChange,
  selectedContent,
  onContentChange,
  tags
}: CollectionTabsProps) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const handleTabChange = (value: string) => {
    trackTabChange(value, user?.id);
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

      <TabsContent value="official" className="mt-2 sm:mt-4">
        <OfficialItemsList 
          items={filteredItems}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          selectedTags={selectedTags}
          onTagsChange={() => {}}
          selectedContent={selectedContent}
          onContentChange={onContentChange}
          tags={tags}
        />
      </TabsContent>

      <TabsContent value="collection" className="mt-2 sm:mt-4">
        <div className="space-y-6">
          <UserCollection
            selectedTags={selectedTags}
            userId={userId}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}
