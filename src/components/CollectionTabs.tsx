
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OfficialItemsList } from "@/components/OfficialItemsList";
import { UserCollection } from "@/components/UserCollection";
import { OfficialItem } from "@/types";
import { OriginalItemsList } from "./OriginalItemsList";

interface CollectionTabsProps {
  filteredItems: OfficialItem[];
  selectedTags: string[];
  userId?: string | null;
}

export function CollectionTabs({
  filteredItems,
  selectedTags,
  userId
}: CollectionTabsProps) {
  return <Tabs defaultValue="official" className="space-y-4">
      <TabsList className="border border-gray-200 rounded-full w-full flex justify-center text-sm sm:text-base p-1">
        <TabsTrigger 
          value="official" 
          className="px-2 sm:px-4 rounded-full data-[state=active]:bg-gray-900 data-[state=active]:text-white transition-colors"
        >
          公式グッズ
        </TabsTrigger>
        <TabsTrigger 
          value="original" 
          className="px-2 sm:px-4 rounded-full data-[state=active]:bg-gray-900 data-[state=active]:text-white transition-colors"
        >
          オリジナルグッズ
        </TabsTrigger>
        <TabsTrigger 
          value="collection" 
          className="px-2 sm:px-4 rounded-full data-[state=active]:bg-gray-900 data-[state=active]:text-white transition-colors"
        >
          マイコレクション
        </TabsTrigger>
      </TabsList>

      <TabsContent value="official" className="space-y-4">
        <OfficialItemsList items={filteredItems} />
      </TabsContent>

      <TabsContent value="original" className="space-y-4">
        <OriginalItemsList />
      </TabsContent>

      <TabsContent value="collection" className="space-y-4">
        <UserCollection selectedTags={selectedTags} userId={userId} />
      </TabsContent>
    </Tabs>;
}
