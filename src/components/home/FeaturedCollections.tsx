
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CollectionGoodsCard } from "@/components/CollectionGoodsCard";
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
        .limit(8);

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
        .limit(8);

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
            <div className="flex gap-2 overflow-x-auto pb-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-1 min-w-[100px]">
                  <Skeleton className="h-24 w-[100px] rounded-md" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="relative">
              <Carousel className="w-full" opts={{ dragFree: true }}>
                <CarouselContent className="-ml-1 md:-ml-2">
                  {todayItems.map((item) => (
                    <CarouselItem key={item.id} className="pl-1 md:pl-2 basis-1/3 md:basis-1/4 lg:basis-1/5">
                      <CollectionGoodsCard
                        id={item.id}
                        title={item.title}
                        image={item.image}
                        releaseDate={item.release_date}
                        prize={item.price}
                        isCompact={true}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex left-0" />
                <CarouselNext className="hidden sm:flex right-0" />
              </Carousel>
              
              {isMobile && todayItems.length > 3 && (
                <div className="flex justify-center items-center mt-1 text-gray-500 text-[10px] bg-gray-100 py-1 px-2 rounded-full mx-auto w-fit">
                  <span>スワイプでもっと見る</span>
                  <ChevronRight className="h-3 w-3 ml-1" />
                </div>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="trending" className="mt-0">
          {isTrendingLoading ? (
            <div className="flex gap-2 overflow-x-auto pb-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-1 min-w-[100px]">
                  <Skeleton className="h-24 w-[100px] rounded-md" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="relative">
              <Carousel className="w-full" opts={{ dragFree: true }}>
                <CarouselContent className="-ml-1 md:-ml-2">
                  {trendingItems.map((item) => (
                    <CarouselItem key={item.id} className="pl-1 md:pl-2 basis-1/3 md:basis-1/4 lg:basis-1/5">
                      <CollectionGoodsCard
                        id={item.id}
                        title={item.title}
                        image={item.image}
                        releaseDate={item.release_date}
                        prize={item.price}
                        isCompact={true}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex left-0" />
                <CarouselNext className="hidden sm:flex right-0" />
              </Carousel>
              
              {isMobile && trendingItems.length > 3 && (
                <div className="flex justify-center items-center mt-1 text-gray-500 text-[10px] bg-gray-100 py-1 px-2 rounded-full mx-auto w-fit">
                  <span>スワイプでもっと見る</span>
                  <ChevronRight className="h-3 w-3 ml-1" />
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
