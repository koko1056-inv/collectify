
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Pencil, CheckCircle, Trash2, Share } from "lucide-react";
import { useState } from "react";
import { WishlistModal } from "./WishlistModal";
import { ItemDetailsModal } from "./ItemDetailsModal";
import { ShareModal } from "./ShareModal";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditingWishlist {
  id: string;
  title: string;
  officialItemId: string;
  note: string | null;
}

export function WishlistViewModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingWishlist, setEditingWishlist] = useState<EditingWishlist | null>(null);
  const [shareItem, setShareItem] = useState<{
    title: string;
    image: string;
  } | null>(null);
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    title: string;
    image: string;
    price?: string;
    releaseDate?: string;
    description?: string;
  } | null>(null);

  const { data: wishlistItems, isLoading } = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: wishlist, error } = await supabase.from("wishlists").select(`
          *,
          official_items (
            title,
            image,
            price,
            release_date,
            description
          )
        `).eq("user_id", user.id);
      if (error) throw error;
      return wishlist;
    },
    enabled: !!user && isOpen
  });

  const handleAddToCollection = async (item: any) => {
    if (!user) {
      toast({
        title: "エラー",
        description: "コレクションに追加するにはログインが必要です。",
        variant: "destructive"
      });
      return;
    }
    try {
      // Add to user's collection
      const { error: insertError } = await supabase.from("user_items").insert({
        title: item.official_items.title,
        image: item.official_items.image,
        release_date: item.official_items.release_date || new Date().toISOString().split('T')[0],
        user_id: user.id,
        prize: item.official_items.price || "0",
        official_item_id: item.official_item_id
      });
      if (insertError) throw insertError;

      // Remove from wishlist
      const { error: deleteError } = await supabase.from("wishlists").delete().eq("id", item.id);
      if (deleteError) throw deleteError;

      // Invalidate relevant queries
      await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      await queryClient.invalidateQueries({ queryKey: ["user-items"] });
      
      toast({
        title: "成功",
        description: "コレクションに追加しました。"
      });
    } catch (error) {
      console.error("Error adding to collection:", error);
      toast({
        title: "エラー",
        description: "コレクションへの追加に失敗しました。",
        variant: "destructive"
      });
    }
  };

  const handleRemoveFromWishlist = async (itemId: string) => {
    try {
      const { error } = await supabase.from("wishlists").delete().eq("id", itemId);
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast({
        title: "成功",
        description: "ウィッシュリストから削除しました。"
      });
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast({
        title: "エラー",
        description: "ウィッシュリストからの削除に失敗しました。",
        variant: "destructive"
      });
    }
  };

  return <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>ウィッシュリスト</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(80vh-8rem)]">
            <div className="space-y-2 pr-4">
              {isLoading ? Array(3).fill(0).map((_, i) => <div key={i} className="flex gap-2 items-center">
                    <Skeleton className="h-16 w-16" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  </div>) : wishlistItems?.length === 0 ? <p className="text-center text-gray-500 py-4 text-sm">
                  まだウィッシュリストに登録されていません
                </p> : wishlistItems?.map(item => <div key={item.id} className="flex gap-2 items-center border rounded-lg p-2 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setSelectedItem({
              id: item.official_item_id,
              title: item.official_items.title,
              image: item.official_items.image,
              price: item.official_items.price,
              releaseDate: item.official_items.release_date,
              description: item.official_items.description
            })}>
                    <img src={item.official_items.image} alt={item.official_items.title} className="h-16 w-16 object-cover rounded-md" />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-sm">{item.official_items.title}</h3>
                          {item.note && <p className="text-xs text-gray-500 mt-1">メモ: {item.note}</p>}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => {
                      e.stopPropagation();
                      setEditingWishlist({
                        id: item.id,
                        title: item.official_items.title,
                        officialItemId: item.official_item_id,
                        note: item.note
                      });
                    }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => {
                      e.stopPropagation();
                      handleAddToCollection(item);
                    }}>
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => {
                      e.stopPropagation();
                      setShareItem({
                        title: item.official_items.title,
                        image: item.official_items.image
                      });
                    }}>
                            <Share className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={e => {
                      e.stopPropagation();
                      handleRemoveFromWishlist(item.id);
                    }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>)}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {editingWishlist && <WishlistModal isOpen={!!editingWishlist} onClose={() => setEditingWishlist(null)} itemId={editingWishlist.officialItemId} itemTitle={editingWishlist.title} existingNote={editingWishlist.note || ""} wishlistId={editingWishlist.id} isEditing={true} />}

      {selectedItem && <ItemDetailsModal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title={selectedItem.title} image={selectedItem.image} price={selectedItem.price} releaseDate={selectedItem.releaseDate} description={selectedItem.description} itemId={selectedItem.id} />}
      
      {shareItem && <ShareModal isOpen={!!shareItem} onClose={() => setShareItem(null)} title={shareItem.title} url={window.location.href} image={shareItem.image} />}
    </>;
}
