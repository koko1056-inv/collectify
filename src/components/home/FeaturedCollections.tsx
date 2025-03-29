
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CollectionGoodsCard } from "@/components/CollectionGoodsCard";
import { Calendar, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CardImage } from "@/components/collection/CardImage";

export function FeaturedCollections() {
  const [featuredItems, setFeaturedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"today" | "trending">("today");

  useEffect(() => {
    const fetchFeaturedItems = async () => {
      setLoading(true);
      try {
        // 今日の人気アイテムまたはトレンドアイテムを取得
        const { data, error } = await supabase
          .from("user_items")
          .select(`
            id,
            title,
            image,
            quantity,
            user_id,
            created_at,
            user_item_likes (count)
          `)
          .limit(4)
          .order(activeTab === "today" ? "created_at" : "likes_count", { ascending: false });

        if (error) throw error;
        setFeaturedItems(data || []);
      } catch (error) {
        console.error("Error fetching featured items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedItems();
  }, [activeTab]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">注目のコレクション</h2>
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          variant={activeTab === "today" ? "default" : "outline"}
          className="rounded-full"
          onClick={() => setActiveTab("today")}
        >
          <Calendar className="h-4 w-4 mr-2" />
          今日のコレクション
        </Button>
        <Button
          variant={activeTab === "trending" ? "default" : "outline"}
          className="rounded-full"
          onClick={() => setActiveTab("trending")}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          トレンド
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm">
              <Skeleton className="h-40 w-full" />
              <div className="p-3">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* デモデータを表示 (実際のデータが空の場合) */}
          {(featuredItems.length > 0 ? featuredItems : [
            { id: "1", title: "ちいかわ オタ活マスコット (ハチワレ)", image: "/lovable-uploads/1eff4585-8952-4265-ae78-8f8da52be7a0.png", quantity: 1 },
            { id: "2", title: "ちいかわ オタ活マスコット (うさぎ)", image: "/lovable-uploads/8cc86917-77c0-4d52-88c5-93b37c881a58.png", quantity: 1 },
            { id: "3", title: "ちいかわ キュート マスコット", image: "/lovable-uploads/8cc86917-77c0-4d52-88c5-93b37c881a58.png", quantity: 1 },
            { id: "4", title: "ちいかわ パーステル マスコット (ハチワレ)", image: "/lovable-uploads/1eff4585-8952-4265-ae78-8f8da52be7a0.png", quantity: 0 }
          ]).map((item) => (
            <div key={item.id} className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="aspect-square relative">
                <img 
                  src={item.image || "/placeholder.svg"} 
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium text-gray-900 truncate">{item.title}</h3>
                <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                  <div className="flex items-center">
                    <span className="text-xs">♥ {Math.floor(Math.random() * 5)}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs">👤 {Math.floor(Math.random() * 3)}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs">🛒 {item.quantity || 1}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
