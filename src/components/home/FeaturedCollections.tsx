
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CollectionGoodsCard } from "@/components/CollectionGoodsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { OfficialItem } from "@/types";

export function FeaturedCollections() {
  const [currentTab, setCurrentTab] = useState<string>("today");
  
  const { data: todayItems = [], isLoading: isTodayLoading } = useQuery<OfficialItem[]>({
    queryKey: ["featured-items", "today"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_items")
        .select(`
          *,
          item_tags (
            tags (
              id,
              name
            )
          )
        `)
        .order("created_at", { ascending: false })
        .limit(4);

      if (error) throw error;
      return data.map(item => ({
        ...item,
        artist: null,
        anime: null
      })) as OfficialItem[];
    },
  });
  
  const { data: trendingItems = [], isLoading: isTrendingLoading } = useQuery<OfficialItem[]>({
    queryKey: ["featured-items", "trending"],
    queryFn: async () => {
      // 実際の実装ではトレンドの基準に基づいてクエリを調整
      const { data, error } = await supabase
        .from("official_items")
        .select(`
          *,
          item_tags (
            tags (
              id,
              name
            )
          )
        `)
        .order("id", { ascending: false })
        .limit(4);

      if (error) throw error;
      return data.map(item => ({
        ...item,
        artist: null,
        anime: null
      })) as OfficialItem[];
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">注目のコレクション</h2>
      
      <Tabs defaultValue="today" className="w-full" onValueChange={setCurrentTab}>
        <TabsList className="mb-4 bg-gray-100">
          <TabsTrigger 
            value="today" 
            className="flex items-center gap-1 data-[state=active]:bg-white rounded-full px-6"
          >
            <Calendar className="h-4 w-4" />
            <span>今日のコレクション</span>
          </TabsTrigger>
          <TabsTrigger 
            value="trending" 
            className="flex items-center gap-1 data-[state=active]:bg-white rounded-full px-6"
          >
            <TrendingUp className="h-4 w-4" />
            <span>トレンド</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="today" className="mt-0">
          {isTodayLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-36 w-full rounded-md" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {todayItems.map((item) => (
                <CollectionGoodsCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  image={item.image}
                  releaseDate={item.release_date}
                  prize={item.price}
                  isCompact={true}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="trending" className="mt-0">
          {isTrendingLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-36 w-full rounded-md" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {trendingItems.map((item) => (
                <CollectionGoodsCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  image={item.image}
                  releaseDate={item.release_date}
                  prize={item.price}
                  isCompact={true}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
