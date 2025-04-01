
import { useState, useEffect } from "react";
import { getUserGroups, getGroupItems, updateGroupColor, getGroupItemCount } from "@/utils/tag/user-groups";
import { GroupInfo } from "@/utils/tag/types";
import { GroupCard } from "./GroupCard";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { GroupItems } from "./GroupItems";
import { AddItemsToGroupDialog } from "./AddItemsToGroupDialog";
import { toast } from "sonner";

interface GroupShowcaseProps {
  userId?: string;
}

export function GroupShowcase({ userId }: GroupShowcaseProps) {
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isItemsDialogOpen, setIsItemsDialogOpen] = useState(false);
  const [isAddItemsDialogOpen, setIsAddItemsDialogOpen] = useState(false);
  const [currentItems, setCurrentItems] = useState<any[]>([]);

  useEffect(() => {
    if (userId) {
      fetchGroups();
    }
  }, [userId]);

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

  const handleCreateGroup = (newGroup: GroupInfo) => {
    setGroups((prev) => [newGroup, ...prev]);
  };

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

  const handleItemsDialogClose = () => {
    setIsItemsDialogOpen(false);
    setSelectedGroupId(null);
  };

  const handleAddItemsClick = (groupId: string) => {
    setSelectedGroupId(groupId);
    setIsAddItemsDialogOpen(true);
  };

  const handleAddItemsClose = () => {
    setIsAddItemsDialogOpen(false);
    fetchGroupItems(); // アイテムが追加された場合のリフレッシュ
    fetchGroups(); // グループリストも更新してアイテム数を反映
  };

  const fetchGroupItems = async () => {
    if (!selectedGroupId) return;
    
    try {
      const items = await getGroupItems(selectedGroupId);
      setCurrentItems(items);
    } catch (error) {
      console.error("Error refreshing group items:", error);
    }
  };

  const handleColorChange = async (groupId: string, color: string) => {
    try {
      const success = await updateGroupColor(groupId, color);
      if (success) {
        // 成功時にローカルの状態を更新
        setGroups(prevGroups => 
          prevGroups.map(group => 
            group.id === groupId ? { ...group, color } : group
          )
        );
      }
    } catch (error) {
      console.error("Error updating group color:", error);
      toast.error("グループの色の更新に失敗しました");
    }
  };

  if (isLoading && groups.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">マイショーケース</h2>
          <Button
            size="sm"
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            グループ作成
          </Button>
        </div>
        
        <div className="py-8 text-center text-gray-500">
          <p>読み込み中...</p>
        </div>
        
        <CreateGroupDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onCreateGroup={handleCreateGroup}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">マイショーケース</h2>
        <Button
          size="sm"
          onClick={() => setIsCreateDialogOpen(true)}
          className="flex items-center gap-1 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          グループ作成
        </Button>
      </div>
      
      {groups.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          <p>まだショーケースグループがありません。</p>
          <p className="mt-2 text-sm">「グループ作成」からあなたのコレクションをグループ化しましょう。</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {groups.map((group) => (
            <div key={group.id} className="flex flex-col">
              <GroupCard
                group={group}
                isSelected={selectedGroupId === group.id}
                onClick={() => handleGroupClick(group.id)}
                onColorChange={handleColorChange}
              />
              <Button
                size="sm"
                variant="outline"
                className="mt-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddItemsClick(group.id);
                }}
              >
                アイテム追加
              </Button>
            </div>
          ))}
        </div>
      )}
      
      <CreateGroupDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreateGroup={handleCreateGroup}
      />
      
      {/* グループ内アイテム表示ダイアログ */}
      {selectedGroupId && (
        <>
          {isItemsDialogOpen && (
            <GroupItems
              group={groups.find(g => g.id === selectedGroupId) || null}
              items={currentItems}
              onClose={handleItemsDialogClose}
            />
          )}
          
          {isAddItemsDialogOpen && (
            <AddItemsToGroupDialog
              isOpen={isAddItemsDialogOpen}
              onClose={handleAddItemsClose}
              groupId={selectedGroupId}
            />
          )}
        </>
      )}
    </div>
  );
}
