import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calendar, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Item3DPreview } from "./Item3DPreview";

interface UserItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  title: string;
  image: string;
}

export function UserItemDetailsModal({
  isOpen,
  onClose,
  itemId,
  title,
  image,
}: UserItemDetailsModalProps) {
  // user_itemの詳細を取得
  const { data: itemDetails, isLoading } = useQuery({
    queryKey: ["user-item-details", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select(`
          *,
          user_item_tags (
            id,
            tag_id,
            tags (
              id,
              name
            )
          )
        `)
        .eq("id", itemId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!itemId,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-6">
            <span className="truncate">{title}</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* メイン画像 */}
            <div className="aspect-square w-full rounded-lg overflow-hidden bg-muted">
              <img
                src={itemDetails?.image || image}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* 3Dプレビュー */}
            {itemDetails?.model_3d_url && (
              <Item3DPreview 
                modelUrl={itemDetails.model_3d_url} 
                title={title} 
              />
            )}

            {/* 詳細情報 */}
            <div className="space-y-3">
              {itemDetails?.content_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">コンテンツ:</span>
                  <span className="font-medium">{itemDetails.content_name}</span>
                </div>
              )}

              {itemDetails?.release_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">発売日:</span>
                  <span className="font-medium">{itemDetails.release_date}</span>
                </div>
              )}

              {itemDetails?.prize && (
                <div className="text-sm">
                  <span className="text-muted-foreground">価格:</span>
                  <span className="font-medium ml-2">{itemDetails.prize}</span>
                </div>
              )}

              {itemDetails?.quantity && itemDetails.quantity > 1 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">所持数:</span>
                  <Badge variant="secondary" className="ml-2">
                    ×{itemDetails.quantity}
                  </Badge>
                </div>
              )}

              {itemDetails?.note && (
                <div className="text-sm">
                  <span className="text-muted-foreground">メモ:</span>
                  <p className="mt-1 text-foreground bg-muted p-2 rounded">
                    {itemDetails.note}
                  </p>
                </div>
              )}

              {/* タグ */}
              {itemDetails?.user_item_tags && itemDetails.user_item_tags.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">タグ:</span>
                  <div className="flex flex-wrap gap-1">
                    {itemDetails.user_item_tags.map((tagItem: any) => (
                      <Badge key={tagItem.id} variant="outline" className="text-xs">
                        {tagItem.tags?.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
