
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { isItemInGroup } from "@/utils/tag/group-items";
import { addItemsToGroup } from "@/utils/tag/tag-groups";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { CollectionGoodsCard } from "../CollectionGoodsCard";
import { Skeleton } from "@/components/ui/skeleton";

interface AddItemsToGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
}

export function AddItemsToGroupDialog({ isOpen, onClose, groupId }: AddItemsToGroupDialogProps) {
  const { user } = useAuth();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ユーザーの全アイテムを取得
  const { data: userItems = [], isLoading, refetch } = useQuery({
    queryKey: ["user-items-for-group", user?.id, groupId, isOpen],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log("Fetching user items for group:", groupId);
      
      // まずユーザーのアイテムを取得
      const { data: userItems, error: userItemsError } = await supabase
        .from("user_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (userItemsError) {
        console.error("Error fetching user items:", userItemsError);
        throw userItemsError;
      }
      
      if (!userItems || userItems.length === 0) {
        console.log("No user items found");
        return [];
      }
      
      console.log("Found", userItems.length, "user items, checking which ones are already in group");
      
      // グループ内のアイテムをチェック
      // group_membersテーブルから既存のアイテムを一括取得（効率化）
      const { data: groupMembers, error: groupMembersError } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);
        
      if (groupMembersError) {
        console.error("Error fetching group members:", groupMembersError);
        throw groupMembersError;
      }
      
      // 既存のメンバーIDのセットを作成
      const existingMemberIds = new Set(groupMembers?.map(item => item.user_id) || []);
      
      // すでにグループ内にないアイテムだけをフィルタリング
      const filteredItems = userItems.filter(item => !existingMemberIds.has(item.id));
      
      console.log("Filtered items:", filteredItems.length, "not in group yet");
      return filteredItems;
    },
    enabled: !!user?.id && isOpen,
  });

  // ダイアログが閉じられたときに選択をリセット
  useEffect(() => {
    if (!isOpen) {
      setSelectedItems([]);
    } else {
      // ダイアログが開かれたときにデータを再取得
      refetch();
    }
  }, [isOpen, refetch]);

  const handleItemSelect = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error("アイテムを選択してください");
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log("Adding items to group:", selectedItems, "groupId:", groupId);
      
      const success = await addItemsToGroup(groupId, selectedItems);
      console.log("Add items result:", success);
      
      if (success) {
        toast.success(`${selectedItems.length}個のアイテムをグループに追加しました`);
        onClose();
      } else {
        toast.error("グループへのアイテム追加に失敗しました");
      }
    } catch (error) {
      console.error("Error adding items to group:", error);
      toast.error("グループへのアイテム追加中にエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>グループにアイテムを追加</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto py-4">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-[120px] w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : userItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                追加できるアイテムがありません。
                すべてのアイテムは既にこのグループに追加されています。
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {userItems.map((item) => (
                <div key={item.id} className="relative">
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => handleItemSelect(item.id)}
                    />
                  </div>
                  <CollectionGoodsCard
                    id={item.id}
                    title={item.title}
                    image={item.image}
                    quantity={item.quantity}
                    isCompact={true}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || selectedItems.length === 0}>
            {isSubmitting ? "追加中..." : "追加"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
