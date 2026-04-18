import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Search, Sparkles, Check } from "lucide-react";
import { RoomItem } from "@/hooks/useMyRoom";
import { placeItemAuto } from "./autoPlace";
import { getItemSlotId } from "./autoPlace";
import { TOTAL_SLOTS } from "./roomSlots";
import { cn } from "@/lib/utils";

interface PlaceItemSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roomId: string;
  roomItems: RoomItem[];
}

export function PlaceItemSheet({ open, onOpenChange, roomId, roomItems }: PlaceItemSheetProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: collection = [], isLoading } = useQuery({
    queryKey: ["my-collection-place", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("user_items")
        .select("id, title, image")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
    enabled: !!user?.id && open,
  });

  const occupiedSlotIds = useMemo(() => new Set(roomItems.map(getItemSlotId)), [roomItems]);
  const placedUserItemIds = useMemo(
    () => new Set(roomItems.map((i) => i.user_item_id).filter(Boolean) as string[]),
    [roomItems],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return collection;
    return collection.filter((c: any) => (c.title ?? "").toLowerCase().includes(q));
  }, [collection, search]);

  const remaining = TOTAL_SLOTS - occupiedSlotIds.size;

  const handlePlace = async (item: { id: string; title: string; image: string }) => {
    if (placedUserItemIds.has(item.id)) {
      toast.info("このグッズはもう飾られています");
      return;
    }
    if (remaining <= 0) {
      toast.error("お部屋が満員です。少し外してから飾ってね");
      return;
    }
    setBusy(item.id);
    const res = await placeItemAuto({
      roomId,
      userItemId: item.id,
      occupiedSlotIds,
    });
    setBusy(null);
    if (res.ok) {
      toast.success(`「${item.title}」を飾りました`);
      qc.invalidateQueries({ queryKey: ["room-items"] });
      occupiedSlotIds.add(0); // 楽観反映
    } else {
      toast.error(res.reason ?? "失敗しました");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 flex flex-col">
        <SheetHeader className="p-5 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            グッズを飾る
          </SheetTitle>
          <SheetDescription>
            タップするだけで自動的にお部屋に並びます (空き {remaining} / {TOTAL_SLOTS})
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="コレクションから検索"
              className="pl-9 rounded-full"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">読み込み中...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {search ? "見つかりませんでした" : "コレクションにグッズがありません"}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {filtered.map((item: any) => {
                const placed = placedUserItemIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handlePlace(item)}
                    disabled={placed || busy === item.id}
                    className={cn(
                      "relative aspect-square rounded-2xl border-2 overflow-hidden bg-muted/30 transition-all",
                      placed
                        ? "border-primary/60 opacity-60"
                        : "border-border hover:border-primary hover:scale-105 active:scale-95",
                    )}
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-contain p-2"
                      loading="lazy"
                    />
                    {placed && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 px-1.5 py-1 bg-gradient-to-t from-black/70 to-transparent">
                      <p className="text-[10px] text-white truncate">{item.title}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full rounded-full">
            閉じる
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
