import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, PackageOpen, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { useLanguage } from "@/contexts/LanguageContext";
import { pastDate, usePastItems, type PastItem } from "@/hooks/usePastItems";
import { shortGoodsTitle } from "@/utils/goodsTitle";
import { fallbackToOriginal, getOptimizedImageUrl } from "@/utils/optimized-image";
import { cn } from "@/lib/utils";

/**
 * コレクションの「手放した」タブ。交換で渡した・売った・あげたグッズを、手放した年ごとに並べる。
 * 図鑑の歴史として残すもので、コンプや所持数には数えない。
 */
export function PastItemsList() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const past = usePastItems();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (past.isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (past.error) return <QueryErrorState title={t("records.past.error")} onRetry={() => past.refetch()} />;
  if (past.pastItems.length === 0) {
    return <EmptyState icon={PackageOpen} title={t("records.past.empty")} description={t("records.past.emptyDesc")} />;
  }

  const byYear = new Map<string, PastItem[]>();
  for (const p of past.pastItems) {
    const y = pastDate(p.releasedAt).slice(0, 4);
    const list = byYear.get(y);
    if (list) list.push(p);
    else byYear.set(y, [p]);
  }

  const handleRemove = async (p: PastItem) => {
    setBusyId(p.id);
    try {
      await past.remove(p.id);
      toast.success(t("records.past.removed"));
    } catch (e) {
      console.error("[PastItemsList] remove failed:", e);
      toast.error(t("records.past.removeFailed"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5" data-testid="past-items-list">
      {[...byYear.entries()].map(([year, items]) => (
        <section key={year} aria-label={t("records.past.year", { year })}>
          <h3 className="mb-2 px-1 text-sm font-bold">
            {t("records.past.year", { year })}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground tabular-nums">{items.length}</span>
          </h3>
          <ul className="space-y-2">
            {items.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5">
                <button
                  type="button"
                  disabled={!p.officialItemId}
                  onClick={() => p.officialItemId && navigate(`/item/${p.officialItemId}`)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  {/* 手放したものは、持っているグッズと見分けがつくよう少し薄く出す */}
                  <img
                    src={getOptimizedImageUrl(p.image ?? "", { width: 160 })}
                    onError={fallbackToOriginal(p.image ?? "")}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-12 w-12 shrink-0 rounded-lg bg-muted/30 object-contain opacity-70 grayscale-[35%]"
                  />
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-xs font-medium leading-snug">{shortGoodsTitle(p.title, p.contentName)}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-2xs text-muted-foreground tabular-nums">
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 font-medium leading-none",
                          p.reason === "trade" ? "bg-primary/10 text-primary" : "bg-muted text-foreground"
                        )}
                      >
                        {t(`records.release.reasons.${p.reason}`)}
                      </span>
                      {pastDate(p.releasedAt)}
                      {p.quantity > 1 && ` ×${p.quantity}`}
                    </span>
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground"
                  onClick={() => void handleRemove(p)}
                  disabled={busyId === p.id}
                  aria-label={t("records.past.removeRecord")}
                  title={t("records.past.removeRecord")}
                >
                  {busyId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
