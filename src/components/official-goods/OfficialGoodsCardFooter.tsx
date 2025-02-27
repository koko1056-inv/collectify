
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { ShoppingBasket, Users } from "lucide-react";
import { TagButton } from "./buttons/TagButton";
import { useState, useEffect } from "react";
import { ItemOwnersModal } from "@/components/ItemOwnersModal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OfficialGoodsCardFooterProps {
  isInCollection: boolean;
  wishlistCount: number;
  onAddToCollection: (e: React.MouseEvent) => void;
  onTagManageClick: (e: React.MouseEvent) => void;
  onWishlistClick: (e: React.MouseEvent) => void;
  itemId: string;
  itemTitle: string;
  itemImage: string;
}

export function OfficialGoodsCardFooter({
  isInCollection,
  wishlistCount,
  onAddToCollection,
  onTagManageClick,
  onWishlistClick,
  itemId,
  itemTitle,
  itemImage,
}: OfficialGoodsCardFooterProps) {
  const [isOwnersModalOpen, setIsOwnersModalOpen] = useState(false);
  const [realtimeWishlistCount, setRealtimeWishlistCount] = useState(0);

  const { data: ownersCount = 0 } = useQuery({
    queryKey: ["item-owners-count", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select("user_id")
        .eq("official_item_id", itemId);
      
      if (error) {
        console.error("Error getting owners count:", error);
        return 0;
      }

      // ユニークなユーザーIDの数を計算
      const uniqueUserIds = new Set(data.map(item => item.user_id));
      return uniqueUserIds.size;
    },
  });

  const { data: tagCount = 0 } = useQuery({
    queryKey: ["item-tags-count", itemId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("item_tags")
        .select("*", { count: 'exact', head: true })
        .eq("official_item_id", itemId);
      
      if (error) {
        console.error("Error getting tag count:", error);
        return 0;
      }
      
      return count || 0;
    },
  });

  useEffect(() => {
    setRealtimeWishlistCount(wishlistCount);
  }, [wishlistCount]);

  useEffect(() => {
    const channel = supabase
      .channel('wishlist-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wishlists',
          filter: `official_item_id=eq.${itemId}`
        },
        async () => {
          const { count, error } = await supabase
            .from("wishlists")
            .select("*", { count: 'exact', head: true })
            .eq("official_item_id", itemId);
          
          if (error) {
            console.error("Error getting realtime wishlist count:", error);
            return;
          }
          
          setRealtimeWishlistCount(count || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId]);

  return (
    <>
      <CardFooter className="p-0.5 sm:p-1.5 pt-0 flex flex-col gap-0.5 sm:gap-1 bg-white border-b border-l border-r border-gray-200 rounded-b-md">
        <div className="flex justify-end gap-0.5 sm:gap-1">
          <TagButton onClick={onTagManageClick} tagCount={tagCount} itemId={itemId} />
          <div className="flex flex-col items-center">
            <Button 
              variant="outline" 
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setIsOwnersModalOpen(true);
              }}
              className="border-gray-200 hover:bg-gray-50 h-5 w-5 sm:h-6 sm:w-6"
            >
              <Users className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
            </Button>
            <span className="text-[7px] sm:text-[8px] text-gray-500 mt-0.5">{ownersCount}</span>
          </div>
          <div className="flex flex-col items-center">
            <Button 
              variant="outline" 
              size="icon"
              onClick={onWishlistClick}
              className="border-gray-200 hover:bg-gray-50 h-5 w-5 sm:h-6 sm:w-6"
            >
              <ShoppingBasket className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-foreground" />
            </Button>
            <span className="text-[7px] sm:text-[8px] text-gray-500 mt-0.5">{realtimeWishlistCount}</span>
          </div>
        </div>
        <Button 
          variant={isInCollection ? "secondary" : "default"}
          className={`w-full text-[7px] sm:text-[8px] h-5 sm:h-6 ${isInCollection ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-gray-900 hover:bg-gray-800'}`}
          onClick={onAddToCollection}
          disabled={isInCollection}
        >
          {isInCollection ? "追加済み" : "コレクションに追加"}
        </Button>
      </CardFooter>

      <ItemOwnersModal
        isOpen={isOwnersModalOpen}
        onClose={() => setIsOwnersModalOpen(false)}
        itemTitle={itemTitle}
        itemImage={itemImage}
      />
    </>
  );
}
