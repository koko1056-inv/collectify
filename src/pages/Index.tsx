import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserCollection } from "@/components/UserCollection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchBar } from "@/components/SearchBar";
import { OfficialItemsList } from "@/components/OfficialItemsList";
import { OfficialItem, Tag } from "@/types";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["official-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_items")
        .select(`
          *,
          item_tags (
            tag_id,
            tags (
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OfficialItem[];
    },
  });

  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Tag[];
    },
  });

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedTag) {
      const itemTags = item.item_tags?.map(
        (itemTag) => itemTag.tags?.name
      ) || [];
      return matchesSearch && itemTags.includes(selectedTag);
    }
    
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTag={selectedTag}
            onTagSelect={setSelectedTag}
            tags={allTags}
          />

          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedTag === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedTag(null)}
            >
              すべて
            </Badge>
            {allTags.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTag === tag.name ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedTag(tag.name)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>

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
              <OfficialItemsList items={filteredItems} />
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
        </div>
      </main>
    </div>
  );
};

export default Index;