import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { addToCollection } from "@/utils/collection-actions";
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
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
      // 上限チェック付きでコレクションに追加
      const result = await addToCollection({
        userId: user.id,
        title,
        image,
        officialItemId: itemId,
        releaseDate,
        prize: price || "0"
      });

      if (!result.success) {
        if (result.isAtLimit) {
          toast({
            title: "コレクション枠が上限です",
            description: "ポイントショップで枠を追加購入してください。",
            variant: "destructive",
          });
          navigate("/shop");
        } else {
          toast({
            title: "エラー",
            description: result.error || "コレクションへの追加に失敗しました。",
            variant: "destructive",
          });
        }
        return;
      }

      // タグをコピー
      if (result.userItemId) {
        const { data: tags, error: tagsError } = await supabase
          .from("item_tags")
          .select("tag_id")
          .eq("official_item_id", itemId);
        
        if (!tagsError && tags && tags.length > 0) {
          for (const tag of tags) {
            await supabase.from("user_item_tags").insert({
              user_item_id: result.userItemId,
              tag_id: tag.tag_id
            });
          }
        }
      }

      // 状態を更新
      await refetchIsInCollection();
      await refetchOwnersCount();
      await queryClient.invalidateQueries({ queryKey: ["user-items", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["item-owners-count", itemId] });
      await queryClient.invalidateQueries({ queryKey: ["userPoints"] });
      await queryClient.invalidateQueries({ queryKey: ["collectionCount"] });
      
      toast({
        title: "コレクションに追加しました！",
        description: result.pointsAwarded ? `+${result.pointsAwarded}ポイント獲得` : undefined,
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
  
  // ItemButtonsコンポーネントが何も返していなかったので、UIを追加
  return (
    <div className="flex gap-2">
      {!isInCollection ? (
        <Button 
          onClick={handleAddToCollection} 
          disabled={isAddingToCollection}
          className="w-full"
        >
          {isAddingToCollection ? "追加中..." : "コレクションに追加"}
        </Button>
      ) : (
        <Button variant="secondary" disabled className="w-full">
          コレクション済み
        </Button>
      )}
      <Button 
        variant="outline" 
        onClick={handleAddToWishlist} 
        disabled={isAddingToWishlist}
      >
        {isAddingToWishlist ? "追加中..." : "ウィッシュリスト"}
      </Button>
    </div>
  );
}
