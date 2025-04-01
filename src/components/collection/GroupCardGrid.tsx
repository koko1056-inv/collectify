
import { GroupInfo } from "@/utils/tag/types";
import { GroupCard } from "./GroupCard";
import { Button } from "@/components/ui/button";

interface GroupCardGridProps {
  groups: GroupInfo[];
  selectedGroupId: string | null;
  onGroupClick: (groupId: string) => void;
  onAddItemsClick: (groupId: string) => void;
  onColorChange: (groupId: string, color: string) => void;
}

export function GroupCardGrid({
  groups,
  selectedGroupId,
  onGroupClick,
  onAddItemsClick,
  onColorChange,
}: GroupCardGridProps) {
  if (groups.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        <p>まだショーケースグループがありません。</p>
        <p className="mt-2 text-sm">「グループ作成」からあなたのコレクションをグループ化しましょう。</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {groups.map((group) => (
        <div key={group.id} className="flex flex-col">
          <GroupCard
            group={group}
            isSelected={selectedGroupId === group.id}
            onClick={() => onGroupClick(group.id)}
            onColorChange={onColorChange}
          />
          <Button
            size="sm"
            variant="outline"
            className="mt-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onAddItemsClick(group.id);
            }}
          >
            アイテム追加
          </Button>
        </div>
      ))}
    </div>
  );
}
