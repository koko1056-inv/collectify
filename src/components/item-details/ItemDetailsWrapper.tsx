
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Tag } from "@/utils/tag";
import { TagList } from "@/components/collection/TagList";
import { TagManageModal } from "@/components/tag/TagManageModal";
import { ModalHeader } from "./ModalHeader";
import { Button } from "@/components/ui/button";
import { BookMarked, Link2, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { isUUID } from "@/utils/tag/tag-core";
import { Link } from "react-router-dom"; // ここをreact-router-domに変更
import { SimpleItemTag } from "@/utils/tag/types";

interface ItemDetailsWrapperProps {
  itemId: string;
  itemTitle?: string;
  itemImage?: string;
  itemDescription?: string | null;
  itemLink?: string | null;
  itemArtist?: string | null;
  itemAnime?: string | null;
  onClose?: () => void;
  isModal?: boolean;
  isUserCollection?: boolean;
  setIsTagModalOpen?: (open: boolean) => void;
}

export function ItemDetailsWrapper({
  itemId,
  itemTitle,
  itemImage,
  itemDescription,
  itemLink,
  itemArtist,
  itemAnime,
  onClose,
  isModal = true,
  isUserCollection = false,
  setIsTagModalOpen,
}: ItemDetailsWrapperProps) {
  const [isTagManageModalOpen, setIsTagManageModalOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const refetchIsInCollection = async () => {
    await queryClient.invalidateQueries({ 
      queryKey: ["user-item-exists", itemId] 
    });
  };

  const refetchOwnersCount = async () => {
    await queryClient.invalidateQueries({ 
      queryKey: ["item-owners-count", itemId] 
    });
  };

  const { data: itemDetails, isLoading: isItemDetailsLoading } = useQuery({
    queryKey: ["official-item-details", itemId],
    queryFn: async () => {
      if (!isUUID(itemId)) {
        return null;
      }
      const { data, error } = await supabase
        .from("official_items")
        .select("*")
        .eq("id", itemId)
        .single();

      if (error) {
        console.error("Error fetching item details:", error);
        throw error;
      }
      return data;
    },
    enabled: isUUID(itemId),
  });

  const { data: itemTags = [], isLoading: isItemTagsLoading } = useQuery({
    queryKey: ["item-tags", itemId],
    queryFn: async () => {
      if (!isUUID(itemId)) {
        return [];
      }
      const { data, error } = await supabase
        .from("item_tags")
        .select(`
          *,
          tags (*)
        `)
        .eq("official_item_id", itemId);

      if (error) {
        console.error("Error fetching item tags:", error);
        throw error;
      }
      return data?.map((itemTag) => {
        return {
          id: itemTag.id,
          tag_id: itemTag.tag_id,
          tags: itemTag.tags
        } as SimpleItemTag;
      }) as SimpleItemTag[];
    },
    enabled: isUUID(itemId),
  });

  const { data: wishlistCount, isLoading: isWishlistCountLoading } = useQuery({
    queryKey: ["item-wishlist-count", itemId],
    queryFn: async () => {
      if (!isUUID(itemId)) {
        return 0;
      }
      const { data, error } = await supabase
        .from("wishlists")
        .select("*", { count: "exact" })
        .eq("official_item_id", itemId);

      if (error) {
        console.error("Error fetching wishlist count:", error);
        throw error;
      }
      return data?.length || 0;
    },
    enabled: isUUID(itemId),
  });

  const { data: itemOwnersCount, isLoading: isItemOwnersCountLoading } = useQuery({
    queryKey: ["item-owners-count", itemId],
    queryFn: async () => {
      if (!isUUID(itemId)) {
        return 0;
      }
      
      // 修正: サーバー側で認証が必要な場合はユーザーIDを含める必要がある
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      const queryParams: Record<string, any> = {
        official_item_id: itemId
      };
      
      // ユーザーIDが存在する場合、クエリにuser_idを含める
      if (userId) {
        queryParams.user_id = userId;
      }
      
      const { data, error } = await supabase
        .from("user_items")
        .select("id");
      
      // ここでは特定の条件で絞り込む
      // ユーザーIDとは無関係に、すべての一致するアイテムを取得
      const filtered = data?.filter(item => 
        item && item.official_item_id === itemId
      );

      if (error) {
        console.error("Error fetching item owners count:", error);
        throw error;
      }
      
      return filtered?.length || 0;
    },
    enabled: isUUID(itemId),
  });

  const { data: itemCreator, isLoading: isItemCreatorLoading } = useQuery({
    queryKey: ["item-creator", itemDetails?.created_by],
    queryFn: async () => {
      if (!itemDetails?.created_by) {
        return null;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", itemDetails.created_by)
        .single();

      if (error) {
        console.error("Error fetching item creator:", error);
        throw error;
      }
      return data;
    },
    enabled: !!itemDetails?.created_by,
  });

  const handleAddToWishlist = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) {
        toast({
          title: "エラー",
          description: "ウィッシュリストに追加するにはログインが必要です。",
          variant: "destructive",
        });
        return;
      }
      
      const { error } = await supabase
        .from("wishlists")
        .insert({ 
          official_item_id: itemId,
          user_id: userId 
        });

      if (error) {
        console.error("Error adding to wishlist:", error);
        throw error;
      }

      toast({
        title: "ウィッシュリストに追加しました",
        description: "アイテムをウィッシュリストに追加しました。",
      });

      // Invalidate queries to update the UI
      await queryClient.invalidateQueries({ queryKey: ["item-wishlist-count", itemId] });
    } catch (error) {
      toast({
        title: "エラー",
        description: "ウィッシュリストへの追加に失敗しました。",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFromWishlist = async () => {
    try {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("official_item_id", itemId);

      if (error) {
        console.error("Error removing from wishlist:", error);
        throw error;
      }

      toast({
        title: "ウィッシュリストから削除しました",
        description: "アイテムをウィッシュリストから削除しました。",
      });

      // Invalidate queries to update the UI
      await queryClient.invalidateQueries({ queryKey: ["item-wishlist-count", itemId] });
    } catch (error) {
      toast({
        title: "エラー",
        description: "ウィッシュリストからの削除に失敗しました。",
        variant: "destructive",
      });
    }
  };

  const handleAddToCollection = useCallback(async () => {
    try {
      navigate(`/collection/add/${itemId}`);
    } catch (error) {
      console.error("Error adding to collection:", error);
      toast({
        title: "エラー",
        description: "コレクションへの追加に失敗しました。",
        variant: "destructive",
      });
    }
  }, [itemId, navigate, toast]);

  if (isItemDetailsLoading || isItemTagsLoading || isWishlistCountLoading || isItemOwnersCountLoading || isItemCreatorLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!itemDetails) {
    return (
      <div className="flex items-center justify-center h-48">
        アイテムが見つかりませんでした
      </div>
    );
  }

  // ModalHeaderでのエラー修正: childrenをpropsで渡す
  return (
    <>
      {isModal && (
        <ModalHeader onClose={
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        } />
      )}
      <div className="px-6 py-4">
        <h2 className="text-lg font-semibold mb-2">{itemDetails.title}</h2>
        {itemOwnersCount > 0 && (
          <Badge className="mb-2">
            {itemOwnersCount}人が所持
          </Badge>
        )}
        <div className="mb-4">
          <img
            src={itemDetails.image}
            alt={itemDetails.title}
            className="w-full rounded-md aspect-square object-cover"
          />
        </div>
        {itemDetails.description && (
          <p className="text-sm text-gray-600 mb-4">{itemDetails.description}</p>
        )}
        {/* artist と anime プロパティは存在しない可能性があるため、代わりにpropsから受け取った値を使用 */}
        {itemArtist && (
          <p className="text-sm text-gray-600 mb-2">
            アーティスト: {itemArtist}
          </p>
        )}
        {itemAnime && (
          <p className="text-sm text-gray-600 mb-2">
            アニメ: {itemAnime}
          </p>
        )}
        {itemDetails.release_date && (
          <p className="text-sm text-gray-600 mb-2">
            発売日: {itemDetails.release_date}
          </p>
        )}
        {itemDetails.price && (
          <p className="text-sm text-gray-600 mb-2">
            価格: {itemDetails.price}
          </p>
        )}
        {itemLink && (
          <p className="text-sm text-gray-600 mb-2">
            <Link to={itemLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
              <Link2 className="h-4 w-4" />
              公式サイト
            </Link>
          </p>
        )}
        {itemCreator && (
          <p className="text-sm text-gray-600 mb-2">
            作成者: <Link to={`/profile/${itemCreator.id}`} className="hover:underline">{itemCreator.username}</Link>
          </p>
        )}
        <div className="mb-4">
          <TagList tags={itemTags} />
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" onClick={handleAddToWishlist}>
              <BookMarked className="h-4 w-4 mr-2" />
              ウィッシュリストに追加
            </Button>
            <Button size="sm" onClick={handleAddToCollection}>
              コレクションに追加
            </Button>
          </div>
        </div>
      </div>
      <TagManageModal
        isOpen={isTagManageModalOpen}
        onClose={() => setIsTagManageModalOpen(false)}
        itemIds={[itemId]}
        itemTitle={itemDetails.title}
      />
    </>
  );
}
