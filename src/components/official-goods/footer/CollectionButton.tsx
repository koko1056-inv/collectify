
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

interface CollectionButtonProps {
  itemId: string;
  isInCollection: boolean;
  onAddToCollection: (e: React.MouseEvent) => void;
}

export function CollectionButton({
  itemId,
  isInCollection: initialIsInCollection,
  onAddToCollection,
}: CollectionButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isInCollection, setIsInCollection] = useState(initialIsInCollection);

  // 現在のユーザーがこのアイテムをコレクションに入れているか確認
  const { data: currentIsInCollection, refetch: refetchIsInCollection } = useQuery({
    queryKey: ["is-in-collection", itemId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { count, error } = await supabase
        .from("user_items")
        .select("*", { count: 'exact', head: true })
        .eq("official_item_id", itemId)
        .eq("user_id", user.id);
      
      if (error) {
        console.error("Error checking if item is in collection:", error);
        return false;
      }
      
      return (count || 0) > 0;
    },
    enabled: !!user,
  });

  // 親コンポーネントからのpropsと実際のデータベース状態を同期
  useEffect(() => {
    if (currentIsInCollection !== undefined) {
      setIsInCollection(currentIsInCollection);
    }
  }, [currentIsInCollection]);

  // 初期値と親コンポーネントからの値を同期
  useEffect(() => {
    setIsInCollection(initialIsInCollection);
  }, [initialIsInCollection]);

  // リアルタイム更新をセットアップ
  useEffect(() => {
    if (!user) return;

    const collectionChannel = supabase
      .channel('user-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_items',
          filter: `official_item_id=eq.${itemId} and user_id=eq.${user.id}`
        },
        () => {
          // コレクション状態を更新
          refetchIsInCollection();
          queryClient.invalidateQueries({ queryKey: ["is-in-collection", itemId, user.id] });
          queryClient.invalidateQueries({ queryKey: ["user-items", user.id] });
          queryClient.invalidateQueries({ queryKey: ["item-owners-count", itemId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(collectionChannel);
    };
  }, [itemId, user, queryClient, refetchIsInCollection]);

  return (
    <Button 
      variant={isInCollection ? "secondary" : "default"}
      className={`w-full text-[10px] sm:text-sm h-7 sm:h-9 ${isInCollection ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-gray-900 hover:bg-gray-800'}`}
      onClick={onAddToCollection}
      disabled={isInCollection}
    >
      {isInCollection ? "追加済み" : "コレクションに追加"}
    </Button>
  );
}
