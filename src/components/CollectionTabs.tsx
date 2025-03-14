
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OfficialItemsList } from "@/components/OfficialItemsList";
import { UserCollection } from "@/components/UserCollection";
import { OfficialItem } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { trackTabChange } from "@/utils/analytics";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { useState } from "react";
import { 
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FilterBar } from "@/components/FilterBar";
import { useIsMobile } from "@/hooks/use-mobile";

interface CollectionTabsProps {
  filteredItems: OfficialItem[];
  selectedTags: string[];
  userId?: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedContent: string;
  onContentChange: (content: string) => void;
  tags: any[];
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleTabChange = (value: string) => {
    trackTabChange(value, user?.id);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        {isMobile && (
          <Drawer open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <DrawerTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
              >
                <Filter className="h-4 w-4" />
                フィルター
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[90vh] px-4 pt-4 pb-8">
              <div className="mx-auto w-full max-w-sm">
                <DrawerClose className="flex items-center justify-between mb-4 w-full">
                  <div className="font-medium">フィルター</div>
                  <Button variant="ghost" size="sm">
                    完了
                  </Button>
                </DrawerClose>
                <ScrollArea className="h-[70vh] pr-4">
                  <FilterBar
                    searchQuery={searchQuery}
                    onSearchChange={onSearchChange}
                    selectedTags={selectedTags}
                    onTagsChange={(tags) => {}}
                    selectedContent={selectedContent}
                    onContentChange={onContentChange}
                    tags={tags}
                  />
                </ScrollArea>
              </div>
            </DrawerContent>
          </Drawer>
        )}
        <Tabs defaultValue="official" className="grow" onValueChange={handleTabChange}>
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
            <OfficialItemsList items={filteredItems} />
          </TabsContent>

          <TabsContent value="collection" className="mt-2 sm:mt-4">
            <div className="space-y-6">
              <UserCollection selectedTags={selectedTags} userId={userId} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
