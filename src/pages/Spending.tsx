import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarCheck, Loader2, Lock, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePreorders } from "@/hooks/usePreorders";
import { todayJst } from "@/utils/companion";
import { formatYen, groupPreorders, monthParts } from "@/utils/preorders";
import { byWork, monthlyTotals, spendingKey, toEntry, totalIn, type SpendEntry } from "@/utils/spending";
import { shortGoodsTitle } from "@/utils/goodsTitle";
import { fallbackToOriginal, getOptimizedImageUrl } from "@/utils/optimized-image";
import { cn } from "@/lib/utils";

interface OwnedRow {
  id: string;
  title: string;
  image: string | null;
  content_name: string | null;
  quantity: number | null;
  purchase_price: string | null;
  purchase_date: string | null;
  created_at: string;
}

/**
 * 推し活費。買った値段を入れたグッズ（持っているもの＋手放したもの）を月ごと・作品ごとに数え、
 * 予約中のグッズの支払い予定も出す。値段の入っていないグッズは、ここからまとめて入れられる。
 * 自分だけに見える（人に見せない）。
 */
export default function Spending() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = todayJst();
  const year = today.slice(0, 4);
  const pre = usePreorders();

  const query = useQuery({
    queryKey: spendingKey(user?.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const [owned, past] = await Promise.all([
        supabase
          .from("user_items")
          .select("id, title, image, content_name, quantity, purchase_price, purchase_date, created_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(3000),
        supabase
          .from("past_items")
          .select("content_name, quantity, purchase_price, purchase_date")
          .eq("user_id", user!.id)
          .not("purchase_price", "is", null)
          .limit(3000),
      ]);
      if (owned.error) throw owned.error;
      if (past.error) throw past.error;
      return { owned: (owned.data ?? []) as OwnedRow[], past: past.data ?? [] };
    },
  });

  const entries = useMemo<SpendEntry[]>(() => {
    if (!query.data) return [];
    const list: SpendEntry[] = [];
    for (const r of query.data.owned) {
      const e = toEntry(r);
      if (e) list.push(e);
    }
    // 手放したグッズは、買った日が分かるものだけ（手放した日に払ったわけではないので）
    for (const r of query.data.past) {
      const e = r.purchase_date ? toEntry(r) : null;
      if (e) list.push(e);
    }
    return list;
  }, [query.data]);

  const months = useMemo(() => monthlyTotals(entries, today, 12), [entries, today]);
  const works = useMemo(() => byWork(entries, year, 5), [entries, year]);
  const unpriced = useMemo(
    () => (query.data?.owned ?? []).filter((r) => toEntry({ ...r, created_at: r.created_at }) == null).slice(0, 20),
    [query.data]
  );
  const upcoming = useMemo(
    () => groupPreorders(pre.preorders, today).filter((g) => g.key !== "due" && g.key !== "unknown"),
    [pre.preorders, today]
  );

  const thisMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2];
  const monthMax = Math.max(1, ...months.map((m) => m.total));
  const workMax = Math.max(1, ...works.map((w) => w.total));

  const monthName = (key: string) => {
    const m = monthParts(key);
    return m ? t("records.spending.monthShort", { month: m.month }) : key;
  };

  return (
    <div className="min-h-screen bg-background pb-nav">
      <Navbar />
      <div className="container mx-auto max-w-3xl space-y-6 px-4 py-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={t("misc.common.back")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold">{t("records.spending.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("records.spending.subtitle")}</p>
          </div>
        </div>

        {query.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : query.error ? (
          <QueryErrorState title={t("records.spending.error")} onRetry={() => query.refetch()} />
        ) : (
          <>
            {/* 今月・先月・今年 */}
            <section className="grid grid-cols-3 gap-2" aria-label={t("records.spending.title")}>
              <Stat label={t("records.spending.thisMonth")} value={formatYen(thisMonth?.total ?? 0)} emphasis testId="spending-this-month" />
              <Stat label={t("records.spending.lastMonth")} value={formatYen(lastMonth?.total ?? 0)} />
              <Stat label={t("records.spending.thisYear", { year })} value={formatYen(totalIn(entries, year))} />
            </section>

            {entries.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-4 text-center">
                <ReceiptText className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-semibold">{t("records.spending.empty")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("records.spending.emptyDesc")}</p>
              </div>
            )}

            {/* 月ごと（新しい月が上）。1つの系列なので凡例は無く、金額は行の右に文字で出す */}
            {entries.length > 0 && (
              <section aria-labelledby="spending-months">
                <h2 id="spending-months" className="mb-2 text-sm font-bold">{t("records.spending.months")}</h2>
                <ul className="space-y-1.5" data-testid="spending-months">
                  {[...months].reverse().map((m) => {
                    const current = m.key === thisMonth?.key;
                    const parts = monthParts(m.key);
                    return (
                      <li
                        key={m.key}
                        className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-2"
                        title={`${parts ? t("records.spending.monthLabel", { year: parts.year, month: parts.month }) : m.key} ・ ${formatYen(m.total)} ・ ${t("records.spending.items", { count: m.count })}`}
                      >
                        <span className={cn("text-xs tabular-nums", current ? "font-bold text-foreground" : "text-muted-foreground")}>
                          {monthName(m.key)}
                        </span>
                        <span className="relative h-3 rounded-full bg-muted/60" aria-hidden="true">
                          {m.total > 0 && (
                            <span
                              className={cn("absolute inset-y-0 left-0 rounded-full", current ? "bg-primary" : "bg-primary/45")}
                              style={{ width: `${Math.max(2, (m.total / monthMax) * 100)}%` }}
                            />
                          )}
                        </span>
                        <span className={cn("min-w-[4.5rem] text-right text-xs tabular-nums", current ? "font-bold" : "text-muted-foreground")}>
                          {formatYen(m.total)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* 作品ごと（今年） */}
            {works.length > 0 && (
              <section aria-labelledby="spending-works">
                <h2 id="spending-works" className="mb-2 text-sm font-bold">{t("records.spending.byWork", { year })}</h2>
                <ul className="space-y-1.5">
                  {works.map((w) => (
                    <li key={w.name ?? "none"} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-2">
                      <span className="truncate text-xs">
                        {w.name === "__other" ? t("records.spending.otherWork") : w.name ?? t("records.spending.noWork")}
                      </span>
                      <span className="relative h-3 rounded-full bg-muted/60" aria-hidden="true">
                        <span className="absolute inset-y-0 left-0 rounded-full bg-primary/70" style={{ width: `${Math.max(2, (w.total / workMax) * 100)}%` }} />
                      </span>
                      <span className="min-w-[4.5rem] text-right text-xs tabular-nums">{formatYen(w.total)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 予約の支払い予定 */}
            <section aria-labelledby="spending-upcoming" className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-primary" />
                <h2 id="spending-upcoming" className="text-sm font-bold">{t("records.spending.upcoming")}</h2>
                <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => navigate("/collection?view=preorders")}>
                  {t("records.spending.openPreorders")}
                </Button>
              </div>
              {upcoming.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("records.spending.noUpcoming")}</p>
              ) : (
                <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-sm">
                  {upcoming.map((g) => {
                    const m = monthParts(g.key);
                    return (
                      <div key={g.key} className="contents">
                        <dt className="text-muted-foreground">{m ? t("records.spending.monthLabel", { year: m.year, month: m.month }) : g.key}</dt>
                        <dd className="text-right font-medium tabular-nums">
                          {g.total > 0 ? formatYen(g.total) : "—"}
                          {g.unpriced > 0 && (
                            <span className="ml-1.5 text-2xs font-normal text-muted-foreground">{t("preorders.list.unpriced", { count: g.unpriced })}</span>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              )}
            </section>

            {/* 値段が入っていないグッズ（まとめて入れる） */}
            {unpriced.length > 0 && (
              <section aria-labelledby="spending-unpriced">
                <h2 id="spending-unpriced" className="text-sm font-bold">{t("records.spending.unpriced")}</h2>
                <p className="mb-2 text-2xs text-muted-foreground">{t("records.spending.unpricedDesc")}</p>
                <ul className="space-y-2" data-testid="spending-unpriced">
                  {unpriced.map((r) => (
                    <li key={r.id}>
                      <PriceRow row={r} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <p className="flex items-center justify-center gap-1.5 text-2xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              {t("records.spending.private")}
            </p>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}

function Stat({ label, value, emphasis, testId }: { label: string; value: string; emphasis?: boolean; testId?: string }) {
  return (
    <div className={cn("rounded-2xl border p-3", emphasis ? "border-primary/30 bg-primary/5" : "border-border bg-card")}>
      <p className="text-2xs text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 truncate font-bold tabular-nums", emphasis ? "text-lg" : "text-sm")} data-testid={testId}>
        {value}
      </p>
    </div>
  );
}

/** 値段の入っていないグッズ1つ。その場で1個の値段を入れて保存する */
function PriceRow({ row }: { row: OwnedRow }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const digits = price.replace(/[^\d]/g, "");
    if (!digits) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("user_items").update({ purchase_price: String(Number(digits)) }).eq("id", row.id);
      if (error) throw error;
      toast.success(t("records.spending.saved"));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: spendingKey(user?.id) }),
        queryClient.invalidateQueries({ queryKey: ["user-item-details", row.id] }),
      ]);
    } catch (e) {
      console.error("[Spending] save price failed:", e);
      toast.error(t("records.spending.failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="flex items-center gap-2 rounded-xl border border-border bg-card p-2"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <img
        src={getOptimizedImageUrl(row.image ?? "", { width: 120 })}
        onError={fallbackToOriginal(row.image ?? "")}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-10 w-10 shrink-0 rounded-lg bg-muted/30 object-contain"
      />
      <span className="line-clamp-2 min-w-0 flex-1 text-xs">{shortGoodsTitle(row.title, row.content_name)}</span>
      <Input
        inputMode="numeric"
        value={price}
        onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, "").slice(0, 7))}
        placeholder="¥"
        aria-label={t("records.purchase.price")}
        className="h-9 w-20 shrink-0 text-right tabular-nums"
      />
      <Button type="submit" size="sm" variant="outline" disabled={saving || !price} className="shrink-0">
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("records.spending.save")}
      </Button>
    </form>
  );
}
