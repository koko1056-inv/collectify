import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { isItemInUserCollection } from "@/utils/tag/tag-queries";
import { ModalHeader } from "./item-details/ModalHeader";
import { ItemStatistics } from "./item-details/ItemStatistics";
import { ItemDetailInfo } from "./item-details/ItemDetailInfo";
import { ItemButtons } from "./item-details/ItemButtons";
import { Button } from "@/components/ui/button";
import { Tag, Trash2 } from "lucide-react";
import { useToast } from "./ui/use-toast";
import { TagManageModal } from "./tag/TagManageModal";
import { deleteUserItem } from "@/utils/tag/user-item-operations";
import { ItemDetailsContent } from "./item-details/ItemDetailsContent";
import { ItemNoteField } from "./item-details/ItemNoteField";
import { QuantityInput } from "./item-details/QuantityInput";
import { X } from "lucide-react";
import { SimpleItemTag } from "@/utils/tag/types";

interface ItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  image: string;
  price?: string;
  releaseDate?: string;
  description?: string;
  itemId: string;
  isUserItem?: boolean;
  quantity?: number;
  userId?: string;
  createdBy?: string | null;
  contentName?: string | null;
}

export function ItemDetailsModal({
  isOpen,
  onClose,
  title,
  image,
  price,
  releaseDate = new Date().toISOString().split('T')[0],
  description,
  itemId,
  isUserItem = false,
  quantity = 1,
  userId,
  createdBy,
  contentName
}: ItemDetailsModalProps) {
  const {
    user
  } = useAuth();
  const queryClient = useQueryClient();
  const {
    toast
  } = useToast();
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    image,
    title,
    price,
    description,
    quantity,
    note: undefined as string | null | undefined,
    content_name: contentName ?? null
  });
  const [isQuantityEditing, setIsQuantityEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    data: officialTags = []
  } = useQuery({
    queryKey: ["item-tags", itemId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("item_tags").select(`
          tag_id,
          tags (
            id,
            name,
            category,
            created_at
          )
        `).eq("official_item_id", itemId);
      if (error) throw error;
      return data;
    },
    enabled: !isUserItem && !!itemId
  });

  const {
    data: likesCount = 0
  } = useQuery({
    queryKey: ["item-likes-count", itemId],
    queryFn: async () => {
      if (isUserItem) {
        const {
          count,
          error
        } = await supabase.from("user_item_likes").select("*", {
          count: 'exact',
          head: true
        }).eq("user_item_id", itemId);
        if (error) throw error;
        return count || 0;
      }
      return 0;
    },
    enabled: isUserItem && !!itemId
  });

  const {
    data: ownersCount = 0,
    refetch: refetchOwnersCount
  } = useQuery({
    queryKey: ["item-owners-count", itemId],
    queryFn: async () => {
      if (!isUserItem) {
        const {
          data,
          error
        } = await supabase.from("user_items").select("user_id").eq("official_item_id", itemId);
        if (error) throw error;
        const uniqueUserIds = new Set(data.map(item => item.user_id));
        return uniqueUserIds.size;
      }
      return 0;
    },
    enabled: !isUserItem && !!itemId
  });

  const {
    data: tradesCount = 0
  } = useQuery({
    queryKey: ["item-trades-count", itemId],
    queryFn: async () => {
      if (!isUserItem) {
        const {
          data: userItems,
          error: userItemsError
        } = await supabase.from("user_items").select("id").eq("official_item_id", itemId);
        if (userItemsError) throw userItemsError;
        if (!userItems || userItems.length === 0) return 0;

        const userItemIds = userItems.map(item => item.id);

        const {
          count,
          error
        } = await supabase.from("trade_requests").select("id", {
          count: 'exact',
          head: true
        }).or(`offered_item_id.in.(${userItemIds.join(',')}),requested_item_id.in.(${userItemIds.join(',')})`);
        if (error) throw error;
        return count || 0;
      } else {
        const {
          count,
          error
        } = await supabase.from("trade_requests").select("id", {
          count: 'exact',
          head: true
        }).or(`offered_item_id.eq.${itemId},requested_item_id.eq.${itemId}`);
        if (error) throw error;
        return count || 0;
      }
    },
    enabled: !!itemId
  });

  const {
    data: isInCollection = false,
    refetch: refetchIsInCollection
  } = useQuery({
    queryKey: ["is-in-collection", itemId, user?.id],
    queryFn: async () => {
      if (!user || isUserItem) return isUserItem;
      return await isItemInUserCollection(itemId, user.id);
    },
    enabled: !isUserItem && !!user && !!itemId
  });

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isUserItem && userId === user?.id) {
      const fetchUserItemDetails = async () => {
        const {
          data,
          error
        } = await supabase.from("user_items").select("note").eq("id", itemId).single();
        if (error) {
          console.error("Error fetching user item details:", error);
          return;
        }
        setEditedData({
          image,
          title,
          price,
          description,
          quantity,
          note: data?.note,
          content_name: contentName ?? null
        });
      };
      fetchUserItemDetails();
    } else {
      setEditedData({
        image,
        title,
        price,
        description,
        quantity,
        note: undefined,
        content_name: contentName ?? null
      });
    }
  }, [image, title, price, description, quantity, isUserItem, userId, user?.id, itemId, contentName]);

  useEffect(() => {
    if (!user || isUserItem || !itemId) return;
    const channel = supabase.channel('user-items-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_items',
      filter: `user_id=eq.${user.id} and official_item_id=eq.${itemId}`
    }, async () => {
      await refetchIsInCollection();
      await refetchOwnersCount();
      await queryClient.invalidateQueries({
        queryKey: ["user-items", user.id]
      });
      await queryClient.invalidateQueries({
        queryKey: ["item-owners-count", itemId]
      });
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId, user?.id, isUserItem, queryClient, refetchIsInCollection, refetchOwnersCount]);

  const handleDeleteItem = async () => {
    if (!isUserItem || !itemId) return;
    try {
      const {
        error,
        officialItemId
      } = await deleteUserItem(itemId);
      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: ["user-items"]
      });

      if (officialItemId) {
        queryClient.invalidateQueries({
          queryKey: ["user-item-exists", officialItemId, user?.id]
        });
        queryClient.invalidateQueries({
          queryKey: ["item-owners-count", officialItemId]
        });
      }
      toast({
        title: "アイテムを削除しました",
        description: "コレクションからアイテムを削除しました。"
      });
      onClose();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        title: "エラー",
        description: "アイテムの削除に失敗しました。",
        variant: "destructive"
      });
    }
  };

  const handleSaveUserItemFields = async () => {
    if (!isUserItem || !itemId) return;
    setIsSaving(true);
    try {
      const {
        error
      } = await supabase.from("user_items").update({
        quantity: editedData.quantity,
        note: editedData.note ?? null,
        content_name: editedData.content_name ?? null
      }).eq("id", itemId);
      if (error) throw error;
      await queryClient.invalidateQueries({
        queryKey: ["user-items"]
      });
      toast({
        title: "保存完了",
        description: "個数・メモ・コンテンツを保存しました。"
      });
      setIsQuantityEditing(false);
      setIsEditing(false);
      onClose();
    } catch (error) {
      toast({
        title: "エラー",
        description: "保存に失敗しました。",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const processedOfficialTags: SimpleItemTag[] = Array.isArray(officialTags) ? 
    officialTags.map(tag => ({
      id: tag.tag_id || "",
      tag_id: tag.tag_id || "",
      tags: tag.tags
    })) : [];
    
  return <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] h-[90vh] flex flex-col p-0 overflow-hidden">
          <ModalHeader onClose={
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          } />

          {/* メインコンテンツ - itemIdを追加 */}
          <ItemDetailsContent 
            image={image} 
            title={title} 
            tags={processedOfficialTags} 
            isUserItem={isUserItem} 
            isEditing={isEditing} 
            editedData={editedData} 
            setEditedData={setEditedData} 
            contentName={editedData.content_name ?? contentName} 
            releaseDate={releaseDate} 
            createdBy={createdBy} 
            description={description} 
            itemId={itemId}
          />

          {isUserItem && isEditing && <div className="p-4 pt-0 pb-0 border-t border-gray-100 space-y-4">
              <div>
                <label className="text-sm font-medium">所有個数</label>
                <QuantityInput value={editedData.quantity} onChange={val => setEditedData(prev => ({
              ...prev,
              quantity: val
            }))} min={1} max={200} className="mt-2" />
              </div>
              <ItemNoteField isEditing={isEditing} note={editedData.note} onChange={v => setEditedData(prev => ({
            ...prev,
            note: v
          }))} />
            </div>}

          {isUserItem && <div className="flex justify-between items-center p-4 border-t border-gray-100">
              {isEditing ? <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => {
                    handleSaveUserItemFields();
                  }} disabled={isSaving}>
                      {isSaving ? "保存中..." : "保存"}
                    </Button>
                    <Button variant="outline" onClick={() => {
                    setIsEditing(false);
                    setEditedData({
                      image,
                      title,
                      price,
                      description,
                      quantity,
                      note: undefined,
                      content_name: contentName ?? null
                    });
                  }}>
                      キャンセル
                    </Button>
                  </div> : <Button onClick={() => setIsEditing(true)}>
                    編集する
                  </Button>}

              <Button variant="destructive" size="icon" onClick={() => setIsDeleteConfirmOpen(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>}

          {!isUserItem && <div className="p-4 border-t border-gray-100">
              <ItemButtons isInCollection={isInCollection} itemId={itemId} title={title} image={image} releaseDate={releaseDate} price={price} refetchIsInCollection={refetchIsInCollection} refetchOwnersCount={refetchOwnersCount} />
            </div>}
        </DialogContent>
      </Dialog>

      {isDeleteConfirmOpen && <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <h2 className="text-lg font-bold mb-2">アイテムの削除</h2>
            <p className="mb-4">「{title}」をコレクションから削除しますか？</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
                キャンセル
              </Button>
              <Button variant="destructive" onClick={handleDeleteItem}>
                削除する
              </Button>
            </div>
          </div>
        </Dialog>}
      
      <TagManageModal 
        isOpen={isTagModalOpen} 
        onClose={() => setIsTagModalOpen(false)} 
        itemIds={[itemId]} 
        itemTitle={title} 
        isUserItem={isUserItem} 
      />
    </>;
}
