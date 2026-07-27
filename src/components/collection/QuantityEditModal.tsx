
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";

interface QuantityEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  initialQuantity: number;
  itemTitle: string;
}

export function QuantityEditModal({
  isOpen,
  onClose,
  itemId,
  initialQuantity,
  itemTitle,
}: QuantityEditModalProps) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const handleSave = async () => {
    if (quantity < 1) {
      toast.error(t("collectionScreen.common.error"), {
        description: t("collectionScreen.quantity.minError"),
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("user_items")
        .update({ quantity })
        .eq("id", itemId);

      if (error) throw error;

      toast.success(t("collectionScreen.common.updated"), {
        description: t("collectionScreen.quantity.updated"),
      });

      // Invalidate user items queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["user-items"] });
      onClose();
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error(t("collectionScreen.common.error"), {
        description: t("collectionScreen.quantity.updateFailed"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("collectionScreen.quantity.title")}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="text-sm font-medium mb-2">
            "{itemTitle}"{t("collectionScreen.quantity.editForSuffix")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">{t("collectionScreen.quantity.label")}</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("collectionScreen.common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t("collectionScreen.common.saving") : t("collectionScreen.common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
