
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { AddContentDialogProps } from "./types";

export function AddContentDialog({ isOpen, onClose, onAdd }: AddContentDialogProps) {
  const [newContentName, setNewContentName] = useState("");

  const handleSubmit = () => {
    if (newContentName.trim()) {
      onAdd(newContentName.trim());
      setNewContentName("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新しいコンテンツを追加</DialogTitle>
          <DialogDescription>
            推しコンテンツとして表示したい作品名などを追加できます
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            value={newContentName}
            onChange={(e) => setNewContentName(e.target.value)}
            placeholder="コンテンツ名を入力"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit}>
              追加する
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
