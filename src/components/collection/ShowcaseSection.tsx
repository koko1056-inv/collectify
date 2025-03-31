
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { MemoizedMyCollectionGoodsCard } from "./MyCollectionGoodsCard";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ShowcaseSectionProps {
  userId: string;
}

export function ShowcaseSection({ userId }: ShowcaseSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const { data: showcaseItems = [], isLoading } = useQuery({
    queryKey: ["showcase-items", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select("*")
        .eq("user_id", userId)
        .eq("is_showcased", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">ショーケース</h2>
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  if (showcaseItems.length === 0) {
    return null; // ショーケースアイテムがない場合は表示しない
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? showcaseItems.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === showcaseItems.length - 1 ? 0 : prev + 1));
  };

  const displayedItems = showcaseItems.slice(
    Math.max(0, currentIndex - 1),
    Math.min(showcaseItems.length, currentIndex + 2)
  );

  return (
    <div className="space-y-4 mb-8">
      <h2 className="text-xl font-bold text-gray-900">ショーケース</h2>
      <div className="bg-gradient-to-b from-purple-50 to-gray-50 rounded-lg p-6 shadow-sm border border-purple-100">
        <div className="flex items-center justify-between">
          {showcaseItems.length > 1 && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handlePrev}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          
          <div className="flex-1 grid grid-cols-3 gap-4 justify-items-center px-4">
            {displayedItems.map((item, index) => (
              <div 
                key={item.id} 
                className={`transform transition-all duration-300 ${
                  index === 1 ? "scale-110 z-10" : "scale-90 opacity-80"
                }`}
              >
                <MemoizedMyCollectionGoodsCard
                  id={item.id}
                  title={item.title}
                  image={item.image}
                  quantity={item.quantity}
                  isCompact={false}
                />
              </div>
            ))}
          </div>
          
          {showcaseItems.length > 1 && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleNext}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
