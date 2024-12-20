import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { OfficialGoodsCard } from "@/components/OfficialGoodsCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserCollection } from "@/components/UserCollection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const navigate = useNavigate();

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
      return data;
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
      return data;
    },
  });

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedTag) {
      const itemTags = item.item_tags?.map(
        (itemTag: any) => itemTag.tags?.name
      ) || [];
      return matchesSearch && itemTags.includes(selectedTag);
    }
    
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto mb-8">
          <div className="relative mb-4">
            <Input
              type="text"
              placeholder="グッズを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-gray-200 focus:border-gray-300 focus:ring-gray-200"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTag === tag.name ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  if (selectedTag === tag.name) {
                    setSelectedTag(null);
                  } else {
                    setSelectedTag(tag.name);
                  }
                }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
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

          <TabsContent value="official" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold animate-fade-in text-gray-900">
                公式グッズ
              </h1>
              <Button 
                onClick={() => navigate("/add-item")}
                className="bg-gray-900 hover:bg-gray-800"
              >
                新規アイテムを追加
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item) => (
                <OfficialGoodsCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  image={item.image}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="collection" className="space-y-6">
            <h1 className="text-3xl font-bold animate-fade-in text-gray-900">
              マイコレクション
            </h1>
            <UserCollection />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;