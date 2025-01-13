import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OfficialItemsList } from "@/components/OfficialItemsList";
import { UserCollection } from "@/components/UserCollection";
import { OfficialItem } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { trackTabChange } from "@/utils/analytics";

interface CollectionTabsProps {
  filteredItems: OfficialItem[];
  selectedTags: string[];
  userId?: string | null;
}

export function CollectionTabs({ filteredItems, selectedTags, userId }: CollectionTabsProps) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const handleTabChange = (value: string) => {
    trackTabChange(value, user?.id);
  };

  return (
    <Tabs defaultValue="official" className="space-y-6" onValueChange={handleTabChange}>
      <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-white border border-gray-200">
        <TabsTrigger value="official" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
          {t("tabs.official")}
        </TabsTrigger>
        <TabsTrigger value="collection" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
          {t("tabs.collection")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="official">
        <OfficialItemsList items={filteredItems} />
      </TabsContent>

      <TabsContent value="collection">
        <div className="space-y-8">
          <UserCollection selectedTags={selectedTags} userId={userId} />
        </div>
      </TabsContent>
    </Tabs>
  );
}