import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { GoodsPickTile } from "@/components/collection/GoodsPickTile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSetCompanion } from "@/hooks/useOshi";
import { fuzzyScore } from "@/utils/fuzzy";

interface CompanionPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** すでに相棒のグッズ（選べないようにする） */
  excludeIds: string[];
}

/** 持っているグッズから、相棒を1つ選ぶ */
export function CompanionPicker({ open, onOpenChange, excludeIds }: CompanionPickerProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const setCompanion = useSetCompanion();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["companion-picker-items", user?.id],
    enabled: open && !!user?.id,
    staleTime: 1000 * 60,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select("id, title, image, content_name")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const visible = useMemo(() => {
    const ex = new Set(excludeIds);
    const base = items.filter((i) => !ex.has(i.id as string));
    const q = query.trim();
    if (!q) return base;
    return base.filter((i) => fuzzyScore(q, i.title as string) >= 0.5 || fuzzyScore(q, (i.content_name as string) ?? "") >= 0.75);
  }, [items, excludeIds, query]);

  const pick = async (id: string) => {
    try {
      await setCompanion.mutateAsync(id);
      toast.success(t("engage.oshi.companionAdded"));
      onOpenChange(false);
      setQuery("");
    } catch (e) {
      const message = e instanceof Error ? e.message : (e as { message?: string })?.message ?? "";
      toast.error(message.includes("companion_limit") ? t("engage.oshi.companionLimit") : t("engage.oshi.careFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-md overflow-hidden p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>{t("engage.oshi.pickTitle")}</DialogTitle>
          <DialogDescription>{t("engage.oshi.pickDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 px-4 pb-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("engage.oshi.pickSearch")} className="pl-9" />
          </div>
          <div className="max-h-[56vh] overflow-y-auto">
            {isLoading ? (
              <div className="grid grid-cols-3 gap-2.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {items.length === 0 ? t("engage.oshi.pickEmpty") : t("engage.oshi.pickNone")}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                {visible.map((item) => (
                  <GoodsPickTile
                    key={item.id as string}
                    image={item.image as string}
                    title={item.title as string}
                    subtitle={(item.content_name as string) ?? null}
                    busy={setCompanion.isPending}
                    onClick={() => pick(item.id as string)}
                    ariaLabel={item.title as string}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
