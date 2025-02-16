
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { OriginalItem } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { WishlistModal } from "../WishlistModal";
import { ItemDetailsModal } from "../ItemDetailsModal";
import { Button } from "../ui/button";
import { ShoppingBasket, Users } from "lucide-react";

interface OriginalGoodsCardProps {
  item: OriginalItem;
}

export function OriginalGoodsCard({ item }: OriginalGoodsCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const handleAddToCollection = async () => {
    if (!user) {
      toast({
        title: "ログインが必要です",
        description: "コレクションに追加するにはログインしてください。",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.from("user_items").insert({
        title: item.title,
        image: item.image,
        release_date: item.release_date,
        user_id: user.id,
        prize: item.price,
        original_item_id: item.id,
        artist: item.artist,
        anime: item.anime
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["user-items"] });
      
      toast({
        title: "追加しました",
        description: "コレクションにアイテムを追加しました。",
      });
    } catch (error) {
      console.error("Error adding to collection:", error);
      toast({
        title: "エラーが発生しました",
        description: "もう一度お試しください。",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Card className="group relative overflow-hidden">
        <CardContent className="p-0">
          <div 
            className="cursor-pointer" 
            onClick={() => setIsDetailsModalOpen(true)}
          >
            <div className="relative aspect-square overflow-hidden">
              <img
                src={item.image}
                alt={item.title}
                className="object-cover w-full h-full transition-transform group-hover:scale-105"
              />
            </div>
            <div className="p-2">
              <h3 className="text-sm font-medium line-clamp-2">{item.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{item.price}円</p>
            </div>
          </div>
          
          <div className="p-2 pt-0 flex flex-col gap-1">
            <div className="flex justify-end gap-1">
              <Button 
                variant="outline" 
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsWishlistModalOpen(true)}
              >
                <ShoppingBasket className="h-3 w-3" />
              </Button>
            </div>
            <Button 
              onClick={handleAddToCollection}
              className="w-full text-[10px] h-7"
            >
              コレクションに追加
            </Button>
          </div>
        </CardContent>
      </Card>

      <WishlistModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
        itemId={item.id}
        itemTitle={item.title}
        isOriginalItem={true}
      />

      <ItemDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={item.title}
        image={item.image}
        price={item.price}
        releaseDate={item.release_date}
        description={item.description}
        itemId={item.id}
        isOriginalItem={true}
      />
    </>
  );
}
