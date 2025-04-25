
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus } from "lucide-react";
import { ContentSelectionDialogProps } from "./types";

export function ContentSelectionDialog({
  isOpen,
  onClose,
  selectedInterests,
  onToggleContent,
  onSave,
  contentNames,
  onAddNew
}: ContentSelectionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>推しコンテンツを選択</DialogTitle>
          <DialogDescription>
            あなたの推しコンテンツを選んでください
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-end mb-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onAddNew}
          >
            <Plus className="h-4 w-4 mr-1" />
            新規追加
          </Button>
        </div>

        <ScrollArea className="h-[300px] pr-4">
          <div className="grid grid-cols-2 gap-2">
            {contentNames.map((content) => (
              <Button
                key={content.id}
                variant={selectedInterests.includes(content.name) ? "default" : "outline"}
                onClick={() => onToggleContent(content.name)}
                className="w-full justify-center px-2 truncate max-w-full text-xs"
              >
                {content.name}
              </Button>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={() => {
            onSave();
            onClose();
          }}>
            保存する
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
