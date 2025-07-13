
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { OfficialItem } from "@/types";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselPrevious, 
  CarouselNext 
} from "@/components/ui/carousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { OfficialGoodsCard } from "@/components/OfficialGoodsCard";

export function FeaturedCollections() {
  const [currentTab, setCurrentTab] = useState<string>("today");
  const isMobile = useIsMobile();
  
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
        .limit(12);

      if (error) throw error;
      return data.map(item => ({
        ...item,
        artist: null,
        anime: null
      })) as OfficialItem[];
    },
    enabled: currentTab === "today", // 必要な時だけ実行
    staleTime: 2 * 60 * 1000, // 2分間キャッシュ
    gcTime: 5 * 60 * 1000, // 5分間保持
  });
  
  const { data: trendingItems = [], isLoading: isTrendingLoading } = useQuery<OfficialItem[]>({
    queryKey: ["featured-items", "trending"],
    queryFn: async () => {
      // 軽量化：user_itemsの数だけ取得して後でソート
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
        .limit(12);

      if (error) throw error;
      
      return data.map(item => ({
        ...item,
        artist: null,
        anime: null
      })) as OfficialItem[];
    },
    enabled: currentTab === "trending", // 必要な時だけ実行
    staleTime: 2 * 60 * 1000, // 2分間キャッシュ
    gcTime: 5 * 60 * 1000, // 5分間保持
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">注目のコレクション</h2>
      
      <Tabs defaultValue="today" className="w-full" onValueChange={setCurrentTab}>
        <TabsList className="mb-4 bg-gray-100">
          <TabsTrigger 
            value="today" 
            className="flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:border text-gray-500 rounded-full px-3 py-1 text-xs transition-colors"
          >
            <Calendar className="h-4 w-4" />
            <span>最新のコレクション</span>
          </TabsTrigger>
          <TabsTrigger 
            value="trending" 
            className="flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:border text-gray-500 rounded-full px-3 py-1 text-xs transition-colors"
          >
            <TrendingUp className="h-4 w-4" />
            <span>トレンド</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="today" className="mt-0">
          {isTodayLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="aspect-square w-full rounded-md" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {todayItems.map((item) => (
                <OfficialGoodsCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  image={item.image}
                  artist={item.artist}
                  anime={item.anime}
                  price={item.price}
                  releaseDate={item.release_date}
                  description={item.description}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="trending" className="mt-0">
          {isTrendingLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="aspect-square w-full rounded-md" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {trendingItems.map((item) => (
                <OfficialGoodsCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  image={item.image}
                  artist={item.artist}
                  anime={item.anime}
                  price={item.price}
                  releaseDate={item.release_date}
                  description={item.description}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
