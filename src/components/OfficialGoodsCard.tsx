import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { WishlistModal } from "./WishlistModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

interface OfficialGoodsCardProps {
  title: string;
  image: string;
  id: string;
}

export function OfficialGoodsCard({ title, image, id }: OfficialGoodsCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);

  // Check if the item is already in the user's collection
  const { data: isInCollection } = useQuery({
    queryKey: ["user-item-exists", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data } = await supabase
        .from("user_items")
        .select("id")
        .eq("title", title)
        .eq("user_id", user.id)
        .maybeSingle();
      
      return !!data;
    },
    enabled: !!user,
  });

  const handleShare = () => {
    toast({
      title: "共有",
      description: "共有機能は準備中です。",
    });
  };

  const handleAddToCollection = async () => {
    if (!user) {
      toast({
        title: "エラー",
        description: "コレクションに追加するにはログインが必要です。",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("user_items").insert({
        title,
        image,
        release_date: new Date().toISOString(),
        user_id: user.id,
        is_shared: false,
        prize: "0",
      });

      if (error) throw error;

      toast({
        title: "成功",
        description: "コレクションに追加しました。",
      });
    } catch (error) {
      console.error("Error adding to collection:", error);
      toast({
        title: "エラー",
        description: "コレクションへの追加に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card className="hover-scale card-shadow bg-white border border-gray-200">
        <CardHeader className="p-0">
          <div className="aspect-square relative overflow-hidden rounded-t-lg">
            <img
              src={image}
              alt={title}
              className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <CardTitle className="text-lg mb-2 line-clamp-2 text-gray-900">{title}</CardTitle>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between gap-2">
          <Button 
            variant={isInCollection ? "secondary" : "default"}
            className={`flex-1 ${isInCollection ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-gray-900 hover:bg-gray-800'}`}
            onClick={handleAddToCollection}
            disabled={isInCollection}
          >
            {isInCollection ? "追加済み" : "コレクションに追加"}
          </Button>
          <Button variant="outline" size="icon" onClick={handleShare} className="border-gray-200 hover:bg-gray-50">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setIsWishlistModalOpen(true)}
            className="border-gray-200 hover:bg-gray-50"
          >
            <Heart className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
      <WishlistModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
        itemId={id}
        itemTitle={title}
      />
    </>
  );
}