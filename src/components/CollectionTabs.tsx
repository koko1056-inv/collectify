
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

export function CollectionTabs({ filteredItems, selectedTags, userId }: CollectionTabsProps) {
  return (
    <Tabs defaultValue="official" className="space-y-4">
      <TabsList className="bg-white/90 backdrop-blur-sm border-gray-200">
        <TabsTrigger value="official">公式グッズ</TabsTrigger>
        <TabsTrigger value="original">オリジナルグッズ</TabsTrigger>
        <TabsTrigger value="collection">マイコレクション</TabsTrigger>
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
    </Tabs>
  );
}
