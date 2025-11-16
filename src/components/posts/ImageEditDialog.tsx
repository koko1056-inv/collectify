import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ImageEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onEditComplete: (editedImageUrl: string) => void;
  isEditing: boolean;
}

export function ImageEditDialog({
  isOpen,
  onClose,
  imageUrl,
  onEditComplete,
  isEditing,
}: ImageEditDialogProps) {
  const [editPrompt, setEditPrompt] = useState("");

  const handleEdit = () => {
    if (editPrompt.trim()) {
      onEditComplete(editPrompt.trim());
      setEditPrompt("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>画像を編集</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <img
              src={imageUrl}
              alt="編集対象"
              className="w-full h-64 object-cover rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-prompt">編集内容を入力</Label>
            <Input
              id="edit-prompt"
              placeholder="例: 背景を青空にして、明るくして"
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              disabled={isEditing}
            />
            <p className="text-xs text-muted-foreground">
              AI が画像を編集します。具体的な指示を入力してください。
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isEditing}>
              キャンセル
            </Button>
            <Button 
              onClick={handleEdit}
              disabled={!editPrompt.trim() || isEditing}
            >
              {isEditing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  編集中...
                </>
              ) : (
                "編集する"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
