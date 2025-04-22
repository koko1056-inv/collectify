
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface ItemButtonsProps {
  isInCollection: boolean;
  itemId: string;
  title: string;
  image: string;
  releaseDate: string;
  price?: string;
  refetchIsInCollection: () => Promise<any>;
  refetchOwnersCount: () => Promise<any>;
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
        variant: "destructive"
      });
      return;
    }
    setIsAddingToCollection(true);
    try {
      // Add to user's collection
      const {
        data,
        error: insertError
      } = await supabase.from("user_items").insert({
        title: title,
        image: image,
        release_date: releaseDate,
        user_id: user.id,
        prize: price || "0",
        official_item_id: itemId
      }).select().single();
      if (insertError) throw insertError;

      // タグをコピー
      if (data) {
        // タグコピー処理（既存実装を利用）
        const { data: tags, error: tagsError } = await supabase
          .from("item_tags")
          .select("tag_id")
          .eq("official_item_id", itemId);
        
        if (!tagsError && tags && tags.length > 0) {
          for (const tag of tags) {
            await supabase
              .from("user_item_tags")
              .insert({
                user_item_id: data.id,
                tag_id: tag.tag_id
              });
          }
        }
      }

      // 状態を更新
      await refetchIsInCollection();
      await refetchOwnersCount();
      await queryClient.invalidateQueries({
        queryKey: ["user-items", user.id]
      });
      await queryClient.invalidateQueries({
        queryKey: ["item-owners-count", itemId]
      });
      toast({
        title: "成功",
        description: "コレクションに追加しました。"
      });
    } catch (error) {
      console.error("Error adding to collection:", error);
      toast({
        title: "エラー",
        description: "コレクションへの追加に失敗しました。",
        variant: "destructive"
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
        variant: "destructive"
      });
      return;
    }
    setIsAddingToWishlist(true);
    try {
      // Add to user's wishlist
      const {
        error: insertError
      } = await supabase.from("wishlists").insert({
        user_id: user.id,
        official_item_id: itemId
      });
      if (insertError) throw insertError;
      await queryClient.invalidateQueries({
        queryKey: ["wishlist", user.id]
      });
      await queryClient.invalidateQueries({
        queryKey: ["is-in-wishlist", itemId, user.id]
      });
      await queryClient.invalidateQueries({
        queryKey: ["wishlist-counts"]
      });
      toast({
        title: "成功",
        description: "ウィッシュリストに追加しました。"
      });
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      toast({
        title: "エラー",
        description: "ウィッシュリストへの追加に失敗しました。",
        variant: "destructive"
      });
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  return (
    <div className="flex space-x-2 px-4 py-3 border-t border-gray-100">
      {isInCollection ? (
        <Button variant="outline" className="w-full" disabled>
          コレクション済み
        </Button>
      ) : (
        <Button 
          onClick={handleAddToCollection} 
          disabled={isAddingToCollection} 
          className="w-full"
        >
          {isAddingToCollection ? "追加中..." : "コレクションに追加"}
        </Button>
      )}
      <Button 
        variant="outline" 
        onClick={handleAddToWishlist} 
        disabled={isAddingToWishlist}
        className="w-full"
      >
        {isAddingToWishlist ? "追加中..." : "ウィッシュリストに追加"}
      </Button>
    </div>
  );
}
