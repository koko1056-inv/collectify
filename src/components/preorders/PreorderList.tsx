import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, Check, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePreorders, type Preorder } from "@/hooks/usePreorders";
import { todayJst } from "@/utils/companion";
import { formatYen as yen, groupPreorders, isDue, monthParts } from "@/utils/preorders";
import { useReceivePreorder } from "@/hooks/useReceivePreorder";
import { shortGoodsTitle } from "@/utils/goodsTitle";
import { fallbackToOriginal, getOptimizedImageUrl } from "@/utils/optimized-image";
import { cn } from "@/lib/utils";
import { PreorderDialog } from "./PreorderButton";

/**
 * コレクションの「予約中」タブ。発売日を過ぎたもの（届いた？）を先頭に、発売月ごとに並べ、
 * 月ごとに支払い予定（値段を入れた分）を出す。届いたら「届いた」でコレクションに入れる。
 */
export function PreorderList() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const pre = usePreorders();
  const [editing, setEditing] = useState<Preorder | null>(null);
  const today = todayJst();

  if (pre.isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (pre.error) return <QueryErrorState title={t("preorders.list.error")} onRetry={() => pre.refetch()} />;
  if (pre.preorders.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title={t("preorders.list.empty")}
        description={t("preorders.list.emptyDesc")}
        action={<Button onClick={() => navigate("/releases")}>{t("preorders.list.emptyAction")}</Button>}
      />
    );
  }

  const groups = groupPreorders(pre.preorders, today);
  const upcomingTotal = groups.filter((g) => g.key !== "due").reduce((sum, g) => sum + g.total, 0);

  const heading = (key: string) => {
    if (key === "due") return t("preorders.list.due");
    if (key === "unknown") return t("preorders.list.unknownMonth");
    const m = monthParts(key);
    return m ? t("preorders.list.month", { year: m.year, month: m.month }) : key;
  };

  return (
    <div className="space-y-5" data-testid="preorder-list">
      {/* まとめ: 何件予約していて、これからいくら払うか */}
      <div className="flex items-end justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-bold">{t("preorders.list.summary", { count: pre.preorders.length })}</p>
          <p className="mt-0.5 text-2xs text-muted-foreground">{t("preorders.list.totalNote")}</p>
          <button type="button" onClick={() => navigate("/spending")} className="mt-1 text-2xs font-medium text-primary hover:underline">
            {t("records.spending.entryTitle")} →
          </button>
        </div>
        <div className="text-right">
          <p className="text-2xs text-muted-foreground">{t("preorders.list.totalLabel")}</p>
          <p className="text-lg font-bold tabular-nums" data-testid="preorder-total">{yen(upcomingTotal)}</p>
        </div>
      </div>

      {groups.map((g) => (
        <section key={g.key} aria-label={heading(g.key)}>
          <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
            <h3 className={cn("text-sm font-bold", g.key === "due" && "text-primary")}>
              {heading(g.key)}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground tabular-nums">{g.items.length}</span>
            </h3>
            {g.key !== "due" && (
              <p className="text-xs tabular-nums text-muted-foreground">
                {g.total > 0 && <span className="font-semibold text-foreground">{yen(g.total)}</span>}
                {g.unpriced > 0 && <span className="ml-1.5">{t("preorders.list.unpriced", { count: g.unpriced })}</span>}
              </p>
            )}
          </div>
          {g.key === "due" && <p className="mb-2 px-1 text-2xs text-muted-foreground">{t("preorders.list.dueHint")}</p>}
          <ul className="space-y-2">
            {g.items.map((p) => (
              <li key={p.id}>
                <PreorderRow preorder={p} due={isDue(p, today)} onEdit={() => setEditing(p)} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {editing && (
        <PreorderDialog
          target={{ officialItemId: editing.officialItemId, title: editing.title, releaseDate: editing.releaseDate, catalogPrice: editing.catalogPrice }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/** 予約1件。写真・名前・発売日・値段とお店・「届いた」 */
export function PreorderRow({ preorder: p, due, onEdit, compact }: { preorder: Preorder; due: boolean; onEdit?: () => void; compact?: boolean }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const receive = useReceivePreorder();
  const busy = receive.busyId === p.id;
  const details = [
    p.price != null ? `${yen(p.price)}${p.quantity > 1 ? ` ×${p.quantity}` : ""}` : p.quantity > 1 ? `×${p.quantity}` : null,
    p.shop,
  ].filter(Boolean);

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border bg-card p-2.5", due ? "border-primary/40" : "border-border")}>
      <button
        type="button"
        onClick={() => navigate(`/item/${p.officialItemId}`)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <img
          src={getOptimizedImageUrl(p.image, { width: 160 })}
          onError={fallbackToOriginal(p.image)}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn("shrink-0 rounded-lg bg-muted/30 object-contain", compact ? "h-11 w-11" : "h-14 w-14")}
        />
        <span className="min-w-0">
          <span className="line-clamp-2 text-xs font-medium leading-snug">{shortGoodsTitle(p.title, p.contentName)}</span>
          <span className="mt-0.5 block truncate text-2xs text-muted-foreground tabular-nums">
            {p.releaseDate ? t("preorders.list.releaseDate", { date: p.releaseDate.replace(/-/g, "/") }) : t("preorders.list.unknownMonth")}
          </span>
          {details.length > 0 && (
            <span className="block truncate text-2xs text-muted-foreground tabular-nums">{details.join(" ・ ")}</span>
          )}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        {onEdit && (
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={onEdit} aria-label={t("preorders.list.edit")}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant={due ? "default" : "outline"}
          onClick={() => void receive.run(p)}
          disabled={busy}
          className="gap-1"
          data-testid="preorder-receive"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {t("preorders.list.received")}
        </Button>
      </div>
    </div>
  );
}
