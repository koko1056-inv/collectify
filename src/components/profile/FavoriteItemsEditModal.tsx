import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, ArrowLeft, ArrowRight, Plus, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useFavoriteItems,
  useUpdateFavoriteItems,
  FAVORITE_ITEMS_LIMIT,
} from "@/hooks/useFavoriteItems";

interface FavoriteItemsEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

interface SimpleItem {
  id: string;
  title: string;
  image: string;
  content_name: string | null;
}

export function FavoriteItemsEditModal({
  open,
  onOpenChange,
  userId,
}: FavoriteItemsEditModalProps) {
  const { data: currentFavorites = [] } = useFavoriteItems(userId);
  const updateMutation = useUpdateFavoriteItems(userId);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  // モーダルを開いた時に現在の選択を反映
  useEffect(() => {
    if (open) {
      setSelectedIds(currentFavorites.map((i) => i.id));
      setSearch("");
    }
  }, [open, currentFavorites]);

  // 自分のコレクション一覧
  const { data: allItems = [], isLoading } = useQuery({
    queryKey: ["user-items-for-favorites", userId],
    queryFn: async (): Promise<SimpleItem[]> => {
      const { data, error } = await supabase
        .from("user_items")
        .select("id, title, image, content_name")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!userId,
  });

  // ID -> アイテム のマップ
  const itemMap = useMemo(() => {
    const m = new Map<string, SimpleItem>();
    allItems.forEach((i) => m.set(i.id, i));
    // 念のため currentFavorites 由来も登録
    currentFavorites.forEach((i) =>
      m.set(i.id, {
        id: i.id,
        title: i.title,
        image: i.image,
        content_name: i.content_name,
      })
    );
    return m;
  }, [allItems, currentFavorites]);

  // 検索結果
  const filteredItems = useMemo(() => {
    if (!search.trim()) return allItems;
    const q = search.toLowerCase();
    return allItems.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.content_name?.toLowerCase().includes(q) ?? false)
    );
  }, [allItems, search]);

  const isAtLimit = selectedIds.length >= FAVORITE_ITEMS_LIMIT;

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= FAVORITE_ITEMS_LIMIT) {
        toast.error(`最大${FAVORITE_ITEMS_LIMIT}個までです`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeItem = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const handleSave = () => {
    updateMutation.mutate(selectedIds, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            お気に入り TOP{FAVORITE_ITEMS_LIMIT} を編集
          </DialogTitle>
          <DialogDescription className="text-xs">
            最大{FAVORITE_ITEMS_LIMIT}個まで選んで、矢印で順位を変更できます
          </DialogDescription>
        </DialogHeader>

        {/* 選択中の枠 */}
        <div className="px-4 pt-3 pb-2">
          <p className="text-[11px] font-semibold text-muted-foreground mb-2">
            選択中（{selectedIds.length}/{FAVORITE_ITEMS_LIMIT}）
          </p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {Array.from({ length: FAVORITE_ITEMS_LIMIT }).map((_, idx) => {
              const id = selectedIds[idx];
              const item = id ? itemMap.get(id) : null;
              return (
                <div
                  key={idx}
                  className="w-20 shrink-0 flex flex-col items-center gap-1"
                >
                  <div
                    className={cn(
                      "relative w-20 h-24 rounded-lg overflow-hidden border-2",
                      item
                        ? "border-primary bg-muted"
                        : "border-dashed border-border bg-muted/40"
                    )}
                  >
                    {item ? (
                      <>
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-yellow-400 text-yellow-950 text-[10px] font-bold flex items-center justify-center shadow">
                          {idx + 1}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <span className="text-[10px]">{idx + 1}位</span>
                      </div>
                    )}
                  </div>
                  {item && (
                    <div className="flex gap-0.5">
                      <button
                        onClick={() => moveItem(idx, -1)}
                        disabled={idx === 0}
                        className="w-7 h-5 rounded bg-muted hover:bg-muted-foreground/10 disabled:opacity-30 flex items-center justify-center"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveItem(idx, 1)}
                        disabled={idx === selectedIds.length - 1}
                        className="w-7 h-5 rounded bg-muted hover:bg-muted-foreground/10 disabled:opacity-30 flex items-center justify-center"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 検索 */}
        <div className="px-4 pb-2 border-t pt-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="コレクションから検索..."
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        {/* 一覧 */}
        <ScrollArea className="flex-1 px-4 pb-4 min-h-[200px]">
          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              {search
                ? "該当するアイテムがありません"
                : "コレクションにアイテムがありません"}
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {filteredItems.map((item) => {
                const selected = selectedIds.includes(item.id);
                const disabled = !selected && isAtLimit;
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    disabled={disabled}
                    className={cn(
                      "relative aspect-[3/4] rounded-lg overflow-hidden border-2 group transition-all",
                      selected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50",
                      disabled && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {selected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-lg">
                          {selectedIds.indexOf(item.id) + 1}
                        </div>
                      </div>
                    )}
                    {!selected && !disabled && (
                      <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                      <p className="text-white text-[10px] font-medium line-clamp-1 text-left">
                        {item.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="p-4 border-t flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex-1"
          >
            {updateMutation.isPending ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
