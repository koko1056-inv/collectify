
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (quantity < 1) {
      toast({
        title: "エラー",
        description: "数量は1以上を指定してください。",
        variant: "destructive",
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

      toast({
        title: "更新完了",
        description: "アイテム数を更新しました。",
      });

      // Invalidate user items queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["user-items"] });
      onClose();
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast({
        title: "エラー",
        description: "アイテム数の更新に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>所持数の編集</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="text-sm font-medium mb-2">
            "{itemTitle}" の所持数を編集
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">所持数</Label>
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
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
