import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Loader2, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface PublicItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  title: string;
  image: string;
}

interface Memory {
  id: string;
  image_url: string | null;
  comment: string | null;
  created_at: string;
}

/**
 * 他ユーザーのコレクションアイテムの詳細を閲覧専用で表示するモーダル。
 * UserItemDetailsModal の読み取り専用版。
 */
export function PublicItemDetailsModal({
  isOpen,
  onClose,
  itemId,
  title,
  image,
}: PublicItemDetailsModalProps) {
  const { data: itemDetails, isLoading } = useQuery({
    queryKey: ["public-user-item-details", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select(
          `
          *,
          user_item_tags (
            id,
            tag_id,
            tags ( id, name )
          )
        `
        )
        .eq("id", itemId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!itemId,
  });

  // 思い出（公開されているもののみ）
  const { data: memories = [] } = useQuery({
    queryKey: ["public-item-memories", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_memories")
        .select("*")
        .eq("user_item_id", itemId)
        .order("created_at", { ascending: false });

      if (error) return [];
      return (data || []) as Memory[];
    },
    enabled: isOpen && !!itemId,
  });

  const tags = (itemDetails?.user_item_tags ?? [])
    .map((t: any) => t.tags?.name)
    .filter(Boolean) as string[];

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* アイテム画像 */}
        <div className="relative w-full aspect-square bg-muted">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        <div className="p-5 space-y-4">
          {/* タイトル */}
          <h2 className="text-xl font-bold text-foreground">{title}</h2>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* 購入日 */}
              {itemDetails?.purchase_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(itemDetails.purchase_date), "yyyy年M月d日", {
                      locale: ja,
                    })}
                    入手
                  </span>
                </div>
              )}

              {/* メモ */}
              {itemDetails?.note && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {itemDetails.note}
                  </p>
                </div>
              )}

              {/* タグ */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((name) => (
                    <Badge key={name} variant="secondary" className="text-xs">
                      #{name}
                    </Badge>
                  ))}
                </div>
              )}

              {/* 思い出セクション */}
              {memories.length > 0 && (
                <div className="border-t border-border pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <MessageCircle className="w-4 h-4" />
                    思い出 ({memories.length})
                  </div>
                  <div className="space-y-3">
                    {memories.slice(0, 5).map((m) => (
                      <div
                        key={m.id}
                        className="bg-card border border-border rounded-lg overflow-hidden"
                      >
                        {m.image_url && (
                          <img
                            src={m.image_url}
                            alt=""
                            className="w-full max-h-64 object-cover"
                            loading="lazy"
                          />
                        )}
                        {m.comment && (
                          <div className="p-3">
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                              {m.comment}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1.5">
                              {format(new Date(m.created_at), "yyyy/M/d", {
                                locale: ja,
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
