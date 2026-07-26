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
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();

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
            {t("collectionScreen.bulkTag.title")}
          </DialogTitle>
          <DialogDescription>
            {t("collectionScreen.bulkTag.descPrefix")}{selectedItemIds.length}{t("collectionScreen.bulkTag.descSuffix")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* タグ入力 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("collectionScreen.bulkTag.tagName")}</label>
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder={t("collectionScreen.bulkTag.tagPlaceholder")}
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
                {t("collectionScreen.bulkTag.pickExisting")}
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
              {t("collectionScreen.common.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!tagInput.trim() || addTagBulk.isPending || selectedItemIds.length === 0}
            >
              {addTagBulk.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>{t("collectionScreen.bulkTag.addPrefix")}{selectedItemIds.length}{t("collectionScreen.bulkTag.addSuffix")}</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
