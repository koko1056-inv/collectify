import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tag, Loader2 } from "lucide-react";
import { usePersonalTags } from "@/hooks/usePersonalTags";

interface BulkPersonalTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItemIds: string[];
  onComplete?: () => void;
}

export function BulkPersonalTagDialog({
  open,
  onOpenChange,
  selectedItemIds,
  onComplete,
}: BulkPersonalTagDialogProps) {
  const { allUserTags, addTagBulk } = usePersonalTags();
  const [tagInput, setTagInput] = useState("");

  const handleSubmit = async () => {
    const name = tagInput.trim();
    if (!name) return;
    await addTagBulk.mutateAsync({ userItemIds: selectedItemIds, tagName: name });
    setTagInput("");
    onOpenChange(false);
    onComplete?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            マイタグを一括追加
          </DialogTitle>
          <DialogDescription>
            選択中の {selectedItemIds.length} 件のグッズに同じマイタグを付けます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* タグ入力 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">タグ名</label>
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="例: お気に入り、推し1番、撮影用..."
              maxLength={30}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>

          {/* 既存タグから選ぶ */}
          {allUserTags.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                既存のマイタグから選ぶ
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {allUserTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTagInput(tag)}
                    className="transition-transform hover:scale-105"
                  >
                    <Badge
                      variant={tag === tagInput ? "default" : "secondary"}
                      className="cursor-pointer"
                    >
                      {tag}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* アクション */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={addTagBulk.isPending}
            >
              キャンセル
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!tagInput.trim() || addTagBulk.isPending || selectedItemIds.length === 0}
            >
              {addTagBulk.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                `${selectedItemIds.length}件に追加`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
