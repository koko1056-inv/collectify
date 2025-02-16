
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
  existingNote?: string;
  wishlistId?: string;
  isEditing?: boolean;
  isOriginalItem?: boolean;
}

export function WishlistModal({ 
  isOpen, 
  onClose, 
  itemId, 
  itemTitle,
  existingNote,
  wishlistId,
  isEditing = false,
  isOriginalItem = false
}: WishlistModalProps) {
  const [note, setNote] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (existingNote) {
      setNote(existingNote);
    }
  }, [existingNote]);

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "ログインが必要です",
        description: "ウィッシュリストに追加するにはログインしてください。",
      });
      onClose();
      return;
    }

    try {
      if (isEditing && wishlistId) {
        const { error } = await supabase
          .from("wishlists")
          .update({ note })
          .eq("id", wishlistId);

        if (error) throw error;

        toast({
          title: "ウィッシュリストを更新しました",
          description: `${itemTitle}のメモを更新しました。`,
        });
      } else {
        const { error } = await supabase
          .from("wishlists")
          .insert([{
            user_id: user.id,
            note: note,
            ...(isOriginalItem 
              ? { original_item_id: itemId }
              : { official_item_id: itemId }
            )
          }]);

        if (error) throw error;

        toast({
          title: "ウィッシュリストに追加しました",
          description: `${itemTitle}をウィッシュリストに追加しました。`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist-count"] });
      onClose();
      setNote("");
    } catch (error) {
      toast({
        title: "エラーが発生しました",
        description: "もう一度お試しください。",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "ウィッシュリストを編集" : "ウィッシュリストに追加"}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <h4 className="text-sm font-medium mb-2">アイテム</h4>
          <p className="text-sm text-gray-500 mb-4">{itemTitle}</p>
          <h4 className="text-sm font-medium mb-2">メモ (任意)</h4>
          <Textarea
            placeholder="メモを入力..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleSave}>
            {isEditing ? "更新する" : "追加する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
