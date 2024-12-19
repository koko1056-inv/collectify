import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
}

export function WishlistModal({ isOpen, onClose, itemId, itemTitle }: WishlistModalProps) {
  const [note, setNote] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const handleAddToWishlist = async () => {
    if (!user) {
      toast({
        title: "ログインが必要です",
        description: "ウィッシュリストに追加するにはログインしてください。",
      });
      onClose();
      return;
    }

    try {
      const { error } = await supabase
        .from("wishlists")
        .insert([
          {
            user_id: user.id,
            official_item_id: itemId,
            note: note,
          },
        ]);

      if (error) throw error;

      toast({
        title: "ウィッシュリストに追加しました",
        description: `${itemTitle}をウィッシュリストに追加しました。`,
      });
      onClose();
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
          <DialogTitle>ウィッシュリストに追加</DialogTitle>
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
          <Button onClick={handleAddToWishlist}>
            追加する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}