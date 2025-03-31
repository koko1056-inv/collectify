
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { GroupCard } from "./GroupCard";
import { GroupItems } from "./GroupItems";
import { AddGroupModal } from "./AddGroupModal";
import { AddItemsToGroupModal } from "./AddItemsToGroupModal";
import { getUserGroups } from "@/utils/tag/user-groups";
import { GroupInfo } from "@/utils/tag/types";
import { FolderPlus } from "lucide-react";
import { DragEndEvent } from "@dnd-kit/core";
import { Skeleton } from "@/components/ui/skeleton";

export function GroupShowcase() {
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);
  const { user } = useAuth();

  const fetchGroups = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const fetchedGroups = await getUserGroups(user.id);
      setGroups(fetchedGroups);
      
      // 初回ロード時に最初のグループを選択
      if (fetchedGroups.length > 0 && !selectedGroup) {
        setSelectedGroup(fetchedGroups[0]);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [user?.id]);

  const handleDragEnd = (event: DragEndEvent) => {
    // ドラッグ&ドロップの実装は必要に応じて追加
  };

  const handleGroupSelection = (group: GroupInfo) => {
    setSelectedGroup(group);
  };

  const handleAddGroup = () => {
    setIsAddGroupModalOpen(true);
  };

  const handleAddItems = () => {
    setIsAddItemsModalOpen(true);
  };

  const handleGroupAdded = () => {
    fetchGroups();
  };

  const handleItemsAdded = () => {
    fetchGroups();
  };

  if (!user?.id) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">ショーケースを表示するにはログインしてください。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">グループショーケース</h2>
        <Button 
          onClick={handleAddGroup}
          className="flex items-center gap-2"
        >
          <FolderPlus className="h-4 w-4" />
          グループを追加
        </Button>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-[100px] w-full" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">グループがまだありません</p>
          <Button onClick={handleAddGroup}>
            <FolderPlus className="h-4 w-4 mr-2" />
            最初のグループを作成
          </Button>
        </div>
      ) : (
        <>
          <ScrollArea className="pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-2">
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  isSelected={selectedGroup?.id === group.id}
                  onClick={() => handleGroupSelection(group)}
                />
              ))}
            </div>
          </ScrollArea>
          
          {selectedGroup && (
            <div className="mt-6">
              <GroupItems
                group={selectedGroup}
                onAddItems={handleAddItems}
                onDragEnd={handleDragEnd}
              />
            </div>
          )}
        </>
      )}
      
      <AddGroupModal
        isOpen={isAddGroupModalOpen}
        onClose={() => setIsAddGroupModalOpen(false)}
        onGroupAdded={handleGroupAdded}
      />
      
      <AddItemsToGroupModal
        isOpen={isAddItemsModalOpen}
        onClose={() => setIsAddItemsModalOpen(false)}
        group={selectedGroup}
        onItemsAdded={handleItemsAdded}
      />
    </div>
  );
}
