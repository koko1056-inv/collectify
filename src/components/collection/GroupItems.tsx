
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GroupInfo } from "@/utils/tag/types";
import { CollectionGrid } from "./CollectionGrid";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface GroupItemsProps {
  group: GroupInfo | null;
  items: any[];
  onClose: () => void;
  onAddItems?: () => void;
}

export function GroupItems({ group, items, onClose, onAddItems }: GroupItemsProps) {
  if (!group) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{group.name}のアイテム</span>
            {onAddItems && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddItems();
                  onClose();
                }}
                className="flex items-center gap-1 text-xs"
                variant="outline"
              >
                <Plus className="h-3.5 w-3.5" />
                アイテム追加
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {items.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <p>まだアイテムがありません。</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <CollectionGrid
              items={items}
              isCompact={true}
              isSelectionMode={false}
              selectedItems={[]}
              onSelectItem={() => {}}
              onDragEnd={() => {}}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
