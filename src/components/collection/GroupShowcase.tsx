import { useEffect, useState } from "react";
import { GroupCard } from "./GroupCard";
import { getUserGroups } from "@/utils/tag/user-groups";
import { GroupInfo } from "@/utils/tag/types";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { GroupItems } from "./GroupItems";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { AddItemsToGroupDialog } from "./AddItemsToGroupDialog";

interface GroupShowcaseProps {
  userId: string | null;
}

export function GroupShowcase({ userId }: GroupShowcaseProps) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<GroupInfo | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAddItemsDialogOpen, setIsAddItemsDialogOpen] = useState(false);

  const effectiveUserId = userId || user?.id;
  const isOwner = !userId || (user && user.id === userId);

  useEffect(() => {
    if (effectiveUserId) {
      const fetchGroups = async () => {
        setIsLoading(true);
        try {
          const groups = await getUserGroups(effectiveUserId);
          setGroups(groups);
          if (groups.length > 0 && !selectedGroup) {
            setSelectedGroup(groups[0]);
          }
        } catch (error) {
          console.error("Error fetching groups:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchGroups();
    }
  }, [effectiveUserId, selectedGroup]);

  const handleCreateGroup = (newGroup: GroupInfo) => {
    setGroups(prev => [newGroup, ...prev]);
    setSelectedGroup(newGroup);
  };

  const handleDragEnd = (event: any) => {
    // Handle drag end logic here
    console.log("Drag ended:", event);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-gray-800">グループショーケース</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-800">グループショーケース</h2>
      
      <div className="flex flex-wrap gap-4">
        {isOwner && (
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            新しいグループ
          </Button>
        )}
      </div>
      
      {groups.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">グループがまだありません</p>
          {isOwner && (
            <Button onClick={() => setIsCreateDialogOpen(true)} variant="default">
              <Plus className="h-4 w-4 mr-2" />
              グループを作成
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {groups.map(group => (
              <GroupCard
                key={group.id}
                group={group}
                isSelected={selectedGroup?.id === group.id}
                onClick={() => setSelectedGroup(group)}
              />
            ))}
          </div>
          
          {selectedGroup && (
            <GroupItems
              group={selectedGroup}
              onAddItems={() => setIsAddItemsDialogOpen(true)}
              onDragEnd={handleDragEnd}
            />
          )}
        </div>
      )}
      
      <CreateGroupDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreateGroup={handleCreateGroup}
      />
      
      {selectedGroup && (
        <AddItemsToGroupDialog
          isOpen={isAddItemsDialogOpen}
          onClose={() => setIsAddItemsDialogOpen(false)}
          groupId={selectedGroup.id}
        />
      )}
    </div>
  );
}
