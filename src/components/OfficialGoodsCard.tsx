import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { WishlistModal } from "./WishlistModal";
import { TagManageModal } from "./tag/TagManageModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface OfficialGoodsCardProps {
  title: string;
  image: string;
  id: string;
}

export function OfficialGoodsCard({ title, image, id }: OfficialGoodsCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Check if the item is already in the user's collection
  const { data: isInCollection } = useQuery({
    queryKey: ["user-item-exists", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data } = await supabase
        .from("user_items")
        .select("id")
        .eq("official_link", id)
        .eq("user_id", user.id)
        .maybeSingle();
      
      return !!data;
    },
    enabled: !!user,
  });

  // Fetch wishlist count for this item
  const { data: wishlistCount = 0 } = useQuery({
    queryKey: ["wishlist-count", id],
    queryFn: async () => {
      const { count } = await supabase
        .from("wishlists")
        .select("*", { count: 'exact', head: true })
        .eq("official_item_id", id);
      
      return count || 0;
    },
  });

  // Fetch item's tags
  const { data: itemTags = [] } = useQuery({
    queryKey: ["item-tags", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_tags")
        .select(`
          tag_id,
          tags (
            id,
            name,
            created_at
          )
        `)
        .eq("official_item_id", id);
      if (error) throw error;
      return data.map(tag => tag.tags);
    },
  });

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
        official_link: id,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["user-item-exists", id, user.id] });
      queryClient.invalidateQueries({ queryKey: ["user-items", user.id] });

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
          {itemTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {itemTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
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
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsTagModalOpen(true)}
            className="border-gray-200 hover:bg-gray-50"
          >
            <Tag className="h-4 w-4" />
          </Button>
          <div className="flex flex-col items-center">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setIsWishlistModalOpen(true)}
              className="border-gray-200 hover:bg-gray-50"
            >
              <Heart className="h-4 w-4" />
            </Button>
            <span className="text-xs text-gray-500 mt-1">{wishlistCount}</span>
          </div>
        </CardFooter>
      </Card>
      <WishlistModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
        itemId={id}
        itemTitle={title}
      />
      <TagManageModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        itemId={id}
        itemTitle={title}
      />
    </>
  );
}