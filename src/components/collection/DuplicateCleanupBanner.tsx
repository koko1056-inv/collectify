import { useState } from "react";
import { Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDuplicateUserItems, useMergeDuplicateUserItems } from "@/hooks/useDuplicateUserItems";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";

/**
 * 同じグッズが別々のカードになっているときだけ出す「お掃除」の入口。
 * 押すと、まとめる内容を確かめてから、1枚のカード（数で表示）にまとめる。
 */
export function DuplicateCleanupBanner() {
  const { t } = useLanguage();
  const { data: groups = [] } = useDuplicateUserItems();
  const merge = useMergeDuplicateUserItems();
  const [open, setOpen] = useState(false);

  if (groups.length === 0 && !open) return null;

  const totalCards = groups.reduce((sum, g) => sum + g.cardCount, 0);

  const handleMerge = async () => {
    try {
      const res = await merge.mutateAsync();
      toast.success(t("chrome.collection.dedupe.done", { groups: res.mergedGroups, cards: res.removedCards }));
      setOpen(false);
    } catch {
      toast.error(t("chrome.collection.dedupe.failed"));
    }
  };

  return (
    <>
      {groups.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
          <Layers className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t("chrome.collection.dedupe.bannerTitle")}</p>
            <p className="text-xs text-muted-foreground">
              {t("chrome.collection.dedupe.bannerDesc", { groups: groups.length, cards: totalCards })}
            </p>
          </div>
          <Button size="sm" className="shrink-0 rounded-full" onClick={() => setOpen(true)}>
            {t("chrome.collection.dedupe.bannerCta")}
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => !merge.isPending && setOpen(v)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" aria-hidden />
              {t("chrome.collection.dedupe.dialogTitle")}
            </DialogTitle>
            <DialogDescription>{t("chrome.collection.dedupe.dialogDesc")}</DialogDescription>
          </DialogHeader>

          <ul className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {groups.map((g) => (
              <li key={g.groupKey} className="flex items-center gap-3 rounded-lg border border-border p-2">
                <img
                  src={getOptimizedImageUrl(g.image, { width: 96 })}
                  onError={fallbackToOriginal(g.image)}
                  alt=""
                  loading="lazy"
                  className="h-12 w-12 shrink-0 rounded-md bg-muted object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{g.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("chrome.collection.dedupe.groupLine", { n: g.cardCount, total: g.totalQuantity })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t("chrome.collection.dedupe.notes")}</p>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" disabled={merge.isPending} onClick={() => setOpen(false)}>
              {t("chrome.collection.dedupe.later")}
            </Button>
            <Button disabled={merge.isPending || groups.length === 0} onClick={handleMerge}>
              {merge.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  {t("chrome.collection.dedupe.working")}
                </>
              ) : (
                t("chrome.collection.dedupe.confirm")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
