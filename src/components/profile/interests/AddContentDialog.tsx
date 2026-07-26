
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { AddContentDialogProps } from "./types";
import { useLanguage } from "@/contexts/LanguageContext";

export function AddContentDialog({ isOpen, onClose, onAdd }: AddContentDialogProps) {
  const { t } = useLanguage();
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
          <DialogTitle>{t("profileScreen.interests.newTitle")}</DialogTitle>
          <DialogDescription>
            {t("profileScreen.interests.newDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            value={newContentName}
            onChange={(e) => setNewContentName(e.target.value)}
            placeholder={t("profileScreen.interests.newPlaceholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              {t("profileScreen.common.cancel")}
            </Button>
            <Button onClick={handleSubmit}>
              {t("profileScreen.interests.addButton")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
