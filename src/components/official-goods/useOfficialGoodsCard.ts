
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { trackAddToCollection } from "@/utils/analytics";
import { Tag } from "@/types/tag";

interface UseOfficialGoodsCardProps {
  id: string;
  title: string;
  image: string;
}

export function useOfficialGoodsCard({ id, title, image }: UseOfficialGoodsCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: isInCollection = false, refetch: refetchIsInCollection } = useQuery({
    queryKey: ["user-item-exists", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase
        .from("user_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("official_item_id", id)
        .maybeSingle();
      
      if (error) {
        console.error("Error checking if item exists in collection:", error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user,
  });

  const { data: ownersCount = 0 } = useQuery({
    queryKey: ["item-owners-count", id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_items")
        .select("*", { count: 'exact', head: true })
        .eq("official_item_id", id);
      
      if (error) {
        console.error("Error getting owners count:", error);
        return 0;
      }
      
      return count || 0;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('user-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_items',
          filter: `user_id=eq.${user?.id} and official_item_id=eq.${id}`
        },
        async () => {
          await refetchIsInCollection();
          await queryClient.invalidateQueries({ queryKey: ["user-items", user?.id] });
          await queryClient.invalidateQueries({ queryKey: ["item-owners-count", id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user?.id, queryClient, refetchIsInCollection]);

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
      // まずユーザーアイテムを作成
      const { data: userItem, error: insertError } = await supabase
        .from("user_items")
        .insert({
          title,
          image,
          release_date: new Date().toISOString().split('T')[0],
          user_id: user.id,
          prize: "0",
          official_item_id: id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 公式アイテムのタグを取得
      const { data: officialTags, error: tagsError } = await supabase
        .from("item_tags")
        .select(`
          tag_id,
          tags (
            id,
            name
          )
        `)
        .eq("official_item_id", id);

      if (tagsError) throw tagsError;

      // ユーザーアイテムにタグを追加
      if (officialTags && officialTags.length > 0) {
        const userItemTags = officialTags.map(tag => ({
          user_item_id: userItem.id,
          tag_id: tag.tag_id
        }));

        const { error: tagInsertError } = await supabase
          .from("user_item_tags")
          .insert(userItemTags);

        if (tagInsertError) throw tagInsertError;
      }

      // Track the event in Mixpanel
      trackAddToCollection(id, title, user.id);

      // Immediately refetch the queries
      await refetchIsInCollection();
      await queryClient.invalidateQueries({ queryKey: ["user-items", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["item-owners-count", id] });

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

  return {
    isInCollection,
    wishlistCount: 0,
    isWishlistModalOpen,
    isTagModalOpen,
    isCategoryModalOpen,
    setIsWishlistModalOpen,
    setIsTagModalOpen,
    setIsCategoryModalOpen,
    handleAddToCollection,
    ownersCount,
  };
}
