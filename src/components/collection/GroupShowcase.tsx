
import { GroupShowcaseHeader } from "./GroupShowcaseHeader";
import { GroupCardGrid } from "./GroupCardGrid";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { GroupItems } from "./GroupItems";
import { AddItemsToGroupDialog } from "./AddItemsToGroupDialog";
import { useGroupShowcase } from "@/hooks/useGroupShowcase";
import { Skeleton } from "@/components/ui/skeleton";

interface GroupShowcaseProps {
  userId?: string;
}

export function GroupShowcase({ userId }: GroupShowcaseProps) {
  const {
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
  } = useGroupShowcase(userId);

  // ローディング状態の表示
  if (isLoading && groups.length === 0) {
    return (
      <div className="space-y-4">
        <GroupShowcaseHeader onCreateClick={() => setIsCreateDialogOpen(true)} />
        
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
      <GroupShowcaseHeader onCreateClick={() => setIsCreateDialogOpen(true)} />
      
      <GroupCardGrid
        groups={groups}
        selectedGroupId={selectedGroupId}
        onGroupClick={handleGroupClick}
        onAddItemsClick={handleAddItemsClick}
        onColorChange={handleColorChange}
      />
      
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
