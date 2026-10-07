import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Search, PackageOpen } from "lucide-react";
import { PostTarget } from "@/hooks/item-posts/useItemPosts";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { GoodsPickTile } from "@/components/collection/GoodsPickTile";

interface UserItemRow {
  id: string;
  title: string;
  image: string;
}

interface SelectItemForPostModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelect: (target: PostTarget, itemTitle: string, itemImage: string | null) => void;
}

/**
 * 投稿対象のグッズ（自分のコレクション）を選ぶモーダル。
 * 選択後、CreateItemPostModal を開く。
 */
export function SelectItemForPostModal({
  open,
  onOpenChange,
  onSelect,
}: SelectItemForPostModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [q, setQ] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["my-collection-for-post", user?.id],
    queryFn: async (): Promise<UserItemRow[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_items")
        .select("id, title, image")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as UserItemRow[];
    },
    enabled: !!user?.id && open,
  });

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((i) => i.title?.toLowerCase().includes(kw));
  }, [items, q]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("social.itemPosts.selectGoodsTitle")}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("social.itemPosts.searchPlaceholder")}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto -mx-2 px-2">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title={
                items.length === 0
                  ? t("social.itemPosts.emptyCollection")
                  : t("social.itemPosts.noMatch")
              }
            />
          ) : (
            <div className="grid grid-cols-3 gap-2 pb-2">
              {filtered.map((item) => (
                <GoodsPickTile
                  key={item.id}
                  image={item.image || null}
                  title={item.title}
                  onClick={() => {
                    onSelect({ type: "user_item", id: item.id }, item.title, item.image || null);
                    onOpenChange(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
