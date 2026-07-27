
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useSoundEffect } from "@/hooks/useSoundEffect";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { user } = useAuth();
  const { t } = useLanguage();
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
      toast(t("chrome.wishlist.loginRequiredTitle"), {
        description: t("chrome.wishlist.loginRequiredDesc"),
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

        toast.success(t("chrome.wishlist.updatedTitle"), {
          description: t("chrome.wishlist.noteUpdatedDesc", { title: itemTitle }),
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
          
          toast.success(t("chrome.wishlist.updatedTitle"), {
            description: t("chrome.wishlist.noteUpdatedDesc", { title: itemTitle }),
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

          toast.success(t("chrome.wishlist.addedTitle"), {
            description: t("chrome.wishlist.addedDesc", { title: itemTitle }),
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
      toast.error(t("chrome.common.error"), {
        description: t("chrome.wishlist.tryAgain"),
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("chrome.wishlist.editTitle") : t("chrome.wishlist.addTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <h4 className="text-sm font-medium mb-2">{t("chrome.wishlist.item")}</h4>
          <p className="text-sm text-muted-foreground mb-4">{itemTitle}</p>
          <h4 className="text-sm font-medium mb-2">{t("chrome.wishlist.noteOptional")}</h4>
          <Textarea
            placeholder={t("chrome.wishlist.notePlaceholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("chrome.common.cancel")}
          </Button>
          <Button onClick={handleSave}>
            {isEditing ? t("chrome.wishlist.update") : t("chrome.wishlist.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
