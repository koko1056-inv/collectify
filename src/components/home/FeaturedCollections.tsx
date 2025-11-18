
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, ChevronRight } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonGrid } from "@/components/ui/skeleton";
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
  const queryClient = useQueryClient();

  // Supabase Realtimeでofficial_itemsの変更を監視
  useEffect(() => {
    const channel = supabase
      .channel('featured-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETEすべてを監視
          schema: 'public',
          table: 'official_items'
        },
        (payload) => {
          console.log('[FeaturedCollections] official_items changed:', payload);
          // featured-itemsクエリを無効化して再フェッチ
          queryClient.invalidateQueries({ queryKey: ['featured-items'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  
  const { data: todayItems = [], isLoading: isTodayLoading } = useQuery<OfficialItem[]>({
    queryKey: ["featured-items", "today"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_items")
        .select(`
          id,
          title,
          image,
          price,
          release_date,
          created_at,
          created_by,
          content_name,
          description,
          item_type,
          quantity,
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
          id,
          title,
          image,
          price,
          release_date,
          created_at,
          created_by,
          content_name,
          description,
          item_type,
          quantity,
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
            <SkeletonGrid count={12} />
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1">
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
                  createdBy={item.created_by}
                  contentName={item.content_name}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="trending" className="mt-0">
          {isTrendingLoading ? (
            <SkeletonGrid count={12} />
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1">
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
                  createdBy={item.created_by}
                  contentName={item.content_name}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
