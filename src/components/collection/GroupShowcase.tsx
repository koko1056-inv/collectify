
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { GroupInfo } from "@/utils/tag/types";
import { GroupCard } from "./GroupCard";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { AddItemsToGroupDialog } from "./AddItemsToGroupDialog";
import { GroupItems } from "./GroupItems";
import { getUserGroups, updateGroupColor } from "@/utils/tag/user-groups";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface GroupShowcaseProps {
  userId?: string | null;
}

export function GroupShowcase({ userId }: GroupShowcaseProps) {
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAddItemsDialogOpen, setIsAddItemsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

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
      setGroups(userGroups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast.error("グループの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGroupClick = (groupId: string) => {
    setSelectedGroupId(prevId => prevId === groupId ? null : groupId);
  };

  const handleCreateGroup = (newGroup: GroupInfo) => {
    setGroups(prev => [newGroup, ...prev]);
    toast.success("グループを作成しました");
  };

  const handleAddItems = () => {
    if (selectedGroupId) {
      setIsAddItemsDialogOpen(true);
    } else {
      toast.error("アイテムを追加するグループを選択してください");
    }
  };

  const handleGroupColorChange = async (groupId: string, color: string) => {
    try {
      // 楽観的UI更新
      setGroups(prevGroups => 
        prevGroups.map(group => 
          group.id === groupId ? { ...group, color } : group
        )
      );
      
      // サーバーに更新を保存
      const success = await updateGroupColor(groupId, color);
      
      if (success) {
        toast.success("グループの色を更新しました");
        // キャッシュを無効化して再取得を強制
        queryClient.invalidateQueries({ queryKey: ["user-groups", userId] });
      } else {
        // 失敗した場合に元に戻す
        toast.error("グループの色の更新に失敗しました");
        fetchGroups();
      }
    } catch (error) {
      console.error("Error updating group color:", error);
      toast.error("エラーが発生しました");
      fetchGroups();
    }
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 bg-gray-200 rounded"></div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-800">マイグループ</h2>
        <div className="flex gap-2">
          {selectedGroupId && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleAddItems}
            >
              アイテムを追加
            </Button>
          )}
          <Button 
            size="sm"
            variant="outline" 
            className="flex items-center gap-1" 
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            グループ作成
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-gray-50">
          <p className="text-gray-500 mb-2">グループがありません</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsCreateDialogOpen(true)}
            className="mt-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            新規グループを作成
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {groups.map(group => (
              <GroupCard 
                key={group.id} 
                group={group} 
                isSelected={selectedGroupId === group.id}
                onClick={() => handleGroupClick(group.id)}
                onColorChange={handleGroupColorChange}
              />
            ))}
          </div>
          
          {selectedGroupId && (
            <GroupItems 
              groupId={selectedGroupId} 
              groupName={groups.find(g => g.id === selectedGroupId)?.name || ""}
              onClose={() => setSelectedGroupId(null)}
            />
          )}
        </>
      )}

      <CreateGroupDialog 
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreateGroup={handleCreateGroup}
      />

      {selectedGroupId && (
        <AddItemsToGroupDialog
          isOpen={isAddItemsDialogOpen}
          onClose={() => setIsAddItemsDialogOpen(false)}
          groupId={selectedGroupId}
        />
      )}
    </div>
  );
}
