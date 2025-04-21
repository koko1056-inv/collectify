
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { copyTagsFromOfficialItem } from "@/utils/tag-operations";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, QueryObserverResult } from "@tanstack/react-query";

interface ItemButtonsProps {
  isInCollection: boolean;
  itemId: string;
  title: string;
  image: string;
  releaseDate: string;
  price?: string;
  refetchIsInCollection: () => Promise<QueryObserverResult<boolean, Error>>;
  refetchOwnersCount: () => Promise<QueryObserverResult<number, Error>>;
}

export function ItemButtons({
  isInCollection,
  itemId,
  title,
  image,
  releaseDate,
  price,
  refetchIsInCollection,
  refetchOwnersCount
}: ItemButtonsProps) {
  const [isAddingToCollection, setIsAddingToCollection] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // コレクションにアイテムを追加する関数
  const handleAddToCollection = async () => {
    if (!user) {
      toast({
        title: "エラー",
        description: "コレクションに追加するにはログインが必要です。",
        variant: "destructive",
      });
      return;
    }

    setIsAddingToCollection(true);
    try {
      // Add to user's collection
      const { data, error: insertError } = await supabase.from("user_items").insert({
        title: title,
        image: image,
        release_date: releaseDate,
        user_id: user.id,
        prize: price || "0",
        official_item_id: itemId,
      }).select().single();

      if (insertError) throw insertError;

      if (data) {
        await copyTagsFromOfficialItem(itemId, data.id);
      }

      // 状態を更新
      await refetchIsInCollection();
      await refetchOwnersCount();
      await queryClient.invalidateQueries({ queryKey: ["user-items", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["item-owners-count", itemId] });

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
    } finally {
      setIsAddingToCollection(false);
    }
  };

  // ウィッシュリストにアイテムを追加する関数
  const handleAddToWishlist = async () => {
    if (!user) {
      toast({
        title: "エラー",
        description: "ウィッシュリストに追加するにはログインが必要です。",
        variant: "destructive",
      });
      return;
    }

    setIsAddingToWishlist(true);
    try {
      // Add to user's wishlist
      const { error: insertError } = await supabase.from("wishlists").insert({
        user_id: user.id,
        official_item_id: itemId,
      });

      if (insertError) throw insertError;

      await queryClient.invalidateQueries({ queryKey: ["wishlist", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["is-in-wishlist", itemId, user.id] });
      await queryClient.invalidateQueries({ queryKey: ["wishlist-counts"] });

      toast({
        title: "成功",
        description: "ウィッシュリストに追加しました。",
      });
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      toast({
        title: "エラー",
        description: "ウィッシュリストへの追加に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  return (
    <div className="pt-4 space-y-3">
      {isInCollection ? (
        <Button className="w-full bg-green-500 hover:bg-green-600" disabled>
          すでにコレクションに追加済みです
        </Button>
      ) : (
        <Button 
          className="w-full bg-blue-500 hover:bg-blue-600"
          onClick={handleAddToCollection}
          disabled={isAddingToCollection}
        >
          {isAddingToCollection ? "追加中..." : "コレクションに追加"}
        </Button>
      )}
      
      <Button 
        variant="outline" 
        className="w-full text-blue-500 border-blue-500"
        onClick={handleAddToWishlist}
        disabled={isAddingToWishlist}
      >
        {isAddingToWishlist ? "追加中..." : "ウィッシュリストに追加"}
      </Button>
    </div>
  );
}
