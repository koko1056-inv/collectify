import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCollectionDiff } from "./useMatches";
import { DIFF_LABELS, type DiffType } from "./types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

interface Props {
  meId: string | undefined | null;
  otherId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TAB_ORDER: DiffType[] = [
  "they_have_i_want",
  "i_have_they_want",
  "common",
  "they_only",
  "i_only",
];

export function CollectionDiffModal({ meId, otherId, open, onOpenChange }: Props) {
  const { data: diff = [], isLoading } = useCollectionDiff(meId, otherId);
  const [activeTab, setActiveTab] = useState<DiffType>("they_have_i_want");

  const grouped = useMemo(() => {
    const map: Record<DiffType, string[]> = {
      common: [],
      they_have_i_want: [],
      i_have_they_want: [],
      they_only: [],
      i_only: [],
    };
    for (const row of diff) {
      map[row.diff_type].push(row.official_item_id);
    }
    return map;
  }, [diff]);

  const allItemIds = useMemo(() => Array.from(new Set(diff.map((d) => d.official_item_id))), [diff]);

  const { data: items = {} } = useQuery({
    queryKey: ["diff-items", allItemIds.sort().join(",")],
    queryFn: async () => {
      if (allItemIds.length === 0) return {};
      const { data } = await supabase
        .from("official_items")
        .select("id, title, image, content_name")
        .in("id", allItemIds);
      const map: Record<string, any> = {};
      for (const item of data ?? []) map[item.id] = item;
      return map;
    },
    enabled: allItemIds.length > 0,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>コレクション差分</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DiffType)} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full grid grid-cols-5 h-auto">
              {TAB_ORDER.map((t) => (
                <TabsTrigger key={t} value={t} className="flex-col gap-0.5 py-2 px-1 text-[10px] sm:text-xs">
                  <span className="text-base">{DIFF_LABELS[t].emoji}</span>
                  <span className="font-medium leading-tight">{DIFF_LABELS[t].label.split("・")[0]}</span>
                  <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                    {grouped[t].length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {TAB_ORDER.map((t) => (
              <TabsContent key={t} value={t} className="flex-1 overflow-y-auto mt-3">
                {grouped[t].length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">該当するグッズはありません</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {grouped[t].map((id) => {
                      const item = items[id];
                      if (!item) return null;
                      return (
                        <div key={id} className="space-y-1">
                          <div className="aspect-square bg-muted rounded-md overflow-hidden border">
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.title}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <p className="text-[11px] font-medium line-clamp-2 leading-tight">{item.title}</p>
                          {item.content_name && (
                            <p className="text-[10px] text-muted-foreground truncate">{item.content_name}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
