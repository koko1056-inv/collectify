import { Navbar } from "@/components/Navbar";
import { GoodsCard } from "@/components/GoodsCard";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserCollection } from "@/components/UserCollection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["official-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-accent">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto mb-8">
          <div className="relative">
            <Input
              type="text"
              placeholder="グッズを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          </div>
        </div>

        <Tabs defaultValue="official" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="official">公式グッズ</TabsTrigger>
            <TabsTrigger value="collection">マイコレクション</TabsTrigger>
          </TabsList>

          <TabsContent value="official" className="space-y-6">
            <h1 className="text-3xl font-bold animate-fade-in">
              人気のアニメグッズ
            </h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item) => (
                <GoodsCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  image={item.image}
                  price={item.price}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="collection" className="space-y-6">
            <h1 className="text-3xl font-bold animate-fade-in">
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