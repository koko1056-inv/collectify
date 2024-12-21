import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OfficialItemsList } from "@/components/OfficialItemsList";
import { UserCollection } from "@/components/UserCollection";
import { OfficialItem } from "@/types";

interface CollectionTabsProps {
  filteredItems: OfficialItem[];
  selectedTag: string | null;
  onArtistSelect: (artist: string | null) => void;
  onAnimeSelect: (anime: string | null) => void;
}

export function CollectionTabs({ 
  filteredItems, 
  selectedTag,
  onArtistSelect,
  onAnimeSelect,
}: CollectionTabsProps) {
  return (
    <Tabs defaultValue="official" className="space-y-6">
      <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-white border border-gray-200">
        <TabsTrigger value="official" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
          公式グッズ
        </TabsTrigger>
        <TabsTrigger value="collection" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
          マイコレクション
        </TabsTrigger>
      </TabsList>

      <TabsContent value="official">
        <OfficialItemsList 
          items={filteredItems} 
          onArtistSelect={onArtistSelect}
          onAnimeSelect={onAnimeSelect}
        />
      </TabsContent>

      <TabsContent value="collection">
        <div className="space-y-8">
          <h1 className="text-3xl font-bold animate-fade-in text-gray-900">
            マイコレクション
          </h1>
          <UserCollection selectedTag={selectedTag} />
        </div>
      </TabsContent>
    </Tabs>
  );
}