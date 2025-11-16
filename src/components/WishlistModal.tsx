
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useSoundEffect } from "@/hooks/useSoundEffect";

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
  existingNote?: string;
  wishlistId?: string;
  isEditing?: boolean;
}

export function WishlistModal({ 
  isOpen, 
  onClose, 
  itemId, 
  itemTitle,
  existingNote,
  wishlistId,
  isEditing = false
}: WishlistModalProps) {
  const [note, setNote] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { playWishlistSound } = useSoundEffect();

  useEffect(() => {
    if (existingNote) {
      setNote(existingNote);
    } else {
      setNote("");
    }
  }, [existingNote, isOpen]);

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
        // 既に追加されているか確認
        const { data: existingItem, error: checkError } = await supabase
          .from("wishlists")
          .select("id")
          .eq("user_id", user.id)
          .eq("official_item_id", itemId)
          .maybeSingle();
          
        if (checkError) throw checkError;
        
        if (existingItem) {
          // 既に存在する場合は更新
          const { error: updateError } = await supabase
            .from("wishlists")
            .update({ note })
            .eq("id", existingItem.id);
            
          if (updateError) throw updateError;
          
          toast({
            title: "ウィッシュリストを更新しました",
            description: `${itemTitle}のメモを更新しました。`,
          });
        } else {
          // 新規追加
          const { error: insertError } = await supabase
            .from("wishlists")
            .insert([
              {
                user_id: user.id,
                official_item_id: itemId,
                note: note,
              },
            ]);

          if (insertError) throw insertError;

          // 効果音を再生
          playWishlistSound();

          toast({
            title: "ウィッシュリストに追加しました",
            description: `${itemTitle}をウィッシュリストに追加しました。`,
          });
        }
      }

      // すべての関連クエリを無効化して再フェッチを促す
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist-count"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist-counts"] });
      queryClient.invalidateQueries({ queryKey: ["is-in-wishlist"] });
      onClose();
    } catch (error) {
      console.error("Error saving to wishlist:", error);
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
