
import { useState, useEffect } from "react";
import { getUserGroups, getGroupItems, updateGroupColor, getGroupItemCount } from "@/utils/tag/user-groups";
import { GroupInfo } from "@/utils/tag/types";
import { toast } from "sonner";

export function useGroupShowcase(userId?: string) {
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isItemsDialogOpen, setIsItemsDialogOpen] = useState(false);
  const [isAddItemsDialogOpen, setIsAddItemsDialogOpen] = useState(false);
  const [currentItems, setCurrentItems] = useState<any[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // グループ一覧を取得
  const fetchGroups = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const userGroups = await getUserGroups(userId);
      
      // 各グループのアイテム数を取得
      const groupsWithItemCount = await Promise.all(
        userGroups.map(async (group) => {
          const count = await getGroupItemCount(group.id);
          return { ...group, itemCount: count };
        })
      );
      
      setGroups(groupsWithItemCount);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 初回読み込み
  useEffect(() => {
    if (userId) {
      fetchGroups();
    }
  }, [userId]);

  // 新しいグループが作成された時の処理
  const handleCreateGroup = (newGroup: GroupInfo) => {
    setGroups((prev) => [newGroup, ...prev]);
  };

  // グループがクリックされた時の処理
  const handleGroupClick = async (groupId: string) => {
    setSelectedGroupId(groupId);
    
    try {
      const items = await getGroupItems(groupId);
      setCurrentItems(items);
      setIsItemsDialogOpen(true);
    } catch (error) {
      console.error("Error fetching group items:", error);
      toast.error("アイテムの取得に失敗しました");
    }
  };

  // アイテム追加ボタンがクリックされた時の処理
  const handleAddItemsClick = (groupId: string) => {
    setSelectedGroupId(groupId);
    setIsAddItemsDialogOpen(true);
  };

  // グループの色が変更された時の処理
  const handleColorChange = async (groupId: string, color: string) => {
    try {
      console.log("Updating group color:", groupId, color);
      const success = await updateGroupColor(groupId, color);
      
      if (success) {
        // 成功時にローカルの状態を更新
        setGroups(prevGroups => 
          prevGroups.map(group => 
            group.id === groupId ? { ...group, color } : group
          )
        );
        toast.success("グループの色を更新しました");
      } else {
        toast.error("グループの色の更新に失敗しました");
      }
    } catch (error) {
      console.error("Error updating group color:", error);
      toast.error("グループの色の更新に失敗しました");
    }
  };

  // 各ダイアログを閉じる処理
  const handleItemsDialogClose = () => {
    setIsItemsDialogOpen(false);
    setSelectedGroupId(null);
  };

  const handleAddItemsClose = () => {
    setIsAddItemsDialogOpen(false);
    fetchGroupItems();
    fetchGroups();
  };

  // 選択中のグループのアイテムを再取得
  const fetchGroupItems = async () => {
    if (!selectedGroupId) return;
    
    try {
      const items = await getGroupItems(selectedGroupId);
      setCurrentItems(items);
    } catch (error) {
      console.error("Error refreshing group items:", error);
    }
  };

  return {
    groups,
    isLoading,
    selectedGroupId,
    currentItems,
    isCreateDialogOpen,
    isItemsDialogOpen,
    isAddItemsDialogOpen,
    setIsCreateDialogOpen,
    handleCreateGroup,
    handleGroupClick,
    handleItemsDialogClose,
    handleAddItemsClick,
    handleAddItemsClose,
    handleColorChange
  };
}
