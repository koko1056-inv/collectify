import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, Megaphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { PointIcon } from "@/components/ui/point-icon";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useUserPoints } from "@/hooks/usePoints";
import {
  SpotlightError,
  useBuyTradeSpotlight,
  useMyTradeSpotlight,
  type SpotlightPlan,
} from "@/hooks/trade/useTradeSpotlight";
import { cn } from "@/lib/utils";

/**
 * 「注目」の印。注目中の相手のカードに付ける。
 * 状態の印なので、色の薄い面に小さなアイコンと文字だけ（キラキラ・グラデーションは使わない）。
 */
export function SpotlightChip({ className }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <span
      data-testid="spotlight-chip"
      aria-label={t("trade.spotlight.chipAria")}
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full bg-points-soft px-1.5 py-0.5 text-3xs font-semibold leading-none text-points ring-1 ring-inset ring-points/20",
        className
      )}
    >
      <Megaphone className="h-2.5 w-2.5" aria-hidden="true" />
      {t("trade.spotlight.chip")}
    </span>
  );
}

/** 24時間 → 「24時間」、72時間 → 「3日間」 */
function usePlanLabel() {
  const { t } = useLanguage();
  return (hours: number) =>
    hours >= 48 && hours % 24 === 0
      ? t("trade.spotlight.planDays", { n: hours / 24 })
      : t("trade.spotlight.planHours", { n: hours });
}

/**
 * 交換画面の「注目を集める」入口。
 * 「交換に出すグッズを選ぶ」の下に置き、いまの状態（注目中なら何時まで）と値段を見せる。
 * 押すと期間を選ぶシートが開く。何も交換に出していないときは、先にグッズ選びへ案内する。
 */
export function TradeSpotlightCard({
  offerCount,
  onNeedOffers,
}: {
  offerCount: number;
  onNeedOffers: () => void;
}) {
  const { t } = useLanguage();
  const { formatShortDateTime } = useDateFormat();
  const { data: spot, isLoading } = useMyTradeSpotlight();
  const [open, setOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-[62px] w-full rounded-xl" />;
  if (!spot) return null;

  const active = spot.active && !!spot.endsAt;
  const minPrice = spot.plans.length > 0 ? Math.min(...spot.plans.map((p) => p.price)) : null;
  const needOffers = offerCount === 0 && !active;

  return (
    <>
      <button
        type="button"
        data-testid="spotlight-card"
        onClick={() => (needOffers ? onNeedOffers() : setOpen(true))}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
          active
            ? "border-points/30 bg-points-soft/50 hover:bg-points-soft/70"
            : "border-border bg-card hover:bg-muted/50"
        )}
      >
        <IconTile size="sm" tone="points">
          <Megaphone />
        </IconTile>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            {active ? t("trade.spotlight.activeTitle") : t("trade.spotlight.cardTitle")}
            {active && <SpotlightChip />}
          </p>
          <p className="text-xs text-muted-foreground">
            {active
              ? t("trade.spotlight.activeUntil", { time: formatShortDateTime(spot.endsAt!) })
              : needOffers
                ? t("trade.spotlight.cardNeedOffers")
                : t("trade.spotlight.cardDesc")}
          </p>
        </div>
        {active ? (
          <span className="flex shrink-0 items-center text-xs font-semibold text-points">
            {t("trade.spotlight.extend")}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : (
          minPrice !== null &&
          !needOffers && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums">
              <PointIcon size={14} />
              {t("trade.spotlight.priceFrom", { price: minPrice })}
            </span>
          )
        )}
      </button>

      <TradeSpotlightSheet
        open={open}
        onOpenChange={setOpen}
        plans={spot.plans}
        endsAt={active ? spot.endsAt : null}
        maxHours={spot.maxHours}
      />
    </>
  );
}

function TradeSpotlightSheet({
  open,
  onOpenChange,
  plans,
  endsAt,
  maxHours,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: SpotlightPlan[];
  endsAt: string | null;
  maxHours: number;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { formatShortDateTime } = useDateFormat();
  const planLabel = usePlanLabel();
  const { data: points, isLoading: pointsLoading } = useUserPoints();
  const buy = useBuyTradeSpotlight();
  const [picked, setPicked] = useState<string | null>(null);

  const balance = points?.total_points ?? 0;
  const maxDays = Math.round(maxHours / 24);

  // 買ったあとの終わりの時刻。注目中なら、いまの終わりから続けて延びる
  const options = useMemo(() => {
    const now = Date.now();
    const base = endsAt ? Math.max(new Date(endsAt).getTime(), now) : now;
    return plans.map((plan) => {
      const end = base + plan.hours * 3600 * 1000;
      return { plan, end, overLimit: end > now + maxHours * 3600 * 1000 };
    });
  }, [plans, endsAt, maxHours]);

  // 開いたときは、選べるうちいちばん短いものを選んでおく
  useEffect(() => {
    if (!open) return;
    setPicked((prev) => {
      if (prev && options.some((o) => o.plan.duration === prev && !o.overLimit)) return prev;
      return options.find((o) => !o.overLimit)?.plan.duration ?? null;
    });
  }, [open, options]);

  const selected = options.find((o) => o.plan.duration === picked) ?? null;
  const shortBy = selected ? Math.max(0, selected.plan.price - balance) : 0;
  const canBuy = !!selected && !selected.overLimit && shortBy === 0 && !pointsLoading;

  const submit = () => {
    if (!selected || !canBuy) return;
    buy.mutate(selected.plan.duration, {
      onSuccess: ({ endsAt: newEnd }) => {
        toast.success(
          t("trade.spotlight.successToast", { time: formatShortDateTime(newEnd || selected.end) })
        );
        onOpenChange(false);
      },
      onError: (e) => {
        const kind = e instanceof SpotlightError ? e.kind : "other";
        if (kind === "insufficient") {
          toast.error(t("trade.spotlight.insufficientToast"), {
            action: { label: t("trade.spotlight.getPoints"), onClick: () => navigate("/point-shop") },
          });
        } else if (kind === "limit") {
          toast.error(t("trade.spotlight.limitToast", { n: maxDays }));
        } else if (kind === "noOffers") {
          toast.error(t("trade.spotlight.noOffersToast"));
        } else {
          toast.error(t("trade.spotlight.failedToast"));
        }
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        data-testid="spotlight-sheet"
        className="max-h-[90vh] overflow-y-auto rounded-t-2xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5"
      >
        <SheetHeader className="space-y-1 text-left">
          <div className="flex items-center gap-2.5">
            <IconTile size="sm" tone="points">
              <Megaphone />
            </IconTile>
            <SheetTitle>{t("trade.spotlight.sheetTitle")}</SheetTitle>
          </div>
          <SheetDescription className="text-xs">{t("trade.spotlight.sheetDesc")}</SheetDescription>
        </SheetHeader>

        <ul className="mt-3 space-y-1.5">
          {[
            t("trade.spotlight.benefitOrder"),
            t("trade.spotlight.benefitChip"),
            t("trade.spotlight.benefitScope"),
            t("trade.spotlight.benefitBlock"),
          ].map((line) => (
            <li key={line} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-points" aria-hidden="true" />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        {endsAt && (
          <p className="mt-3 rounded-lg bg-points-soft/60 px-3 py-2 text-xs text-foreground">
            {t("trade.spotlight.currentUntil", { time: formatShortDateTime(endsAt) })}
          </p>
        )}

        <div role="radiogroup" aria-label={t("trade.spotlight.sheetTitle")} className="mt-4 grid gap-2">
          {options.map(({ plan, end, overLimit }) => {
            const isPicked = picked === plan.duration;
            const days = plan.hours / 24;
            return (
              <button
                key={plan.duration}
                type="button"
                role="radio"
                aria-checked={isPicked}
                disabled={overLimit}
                data-testid={`spotlight-plan-${plan.duration}`}
                onClick={() => setPicked(plan.duration)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  isPicked ? "border-points bg-points-soft/50 ring-1 ring-points/40" : "border-border hover:bg-muted/50"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    isPicked ? "border-points" : "border-muted-foreground/40"
                  )}
                >
                  {isPicked && <span className="h-2 w-2 rounded-full bg-points" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{planLabel(plan.hours)}</span>
                  <span className="block text-2xs text-muted-foreground">
                    {overLimit
                      ? t("trade.spotlight.overLimit", { n: Math.round(maxHours / 24) })
                      : days > 1
                        ? `${t("trade.spotlight.endsAt", { time: formatShortDateTime(end) })}・${t("trade.spotlight.perDay", { n: Math.round(plan.price / days) })}`
                        : t("trade.spotlight.endsAt", { time: formatShortDateTime(end) })}
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold tabular-nums">
                  <PointIcon size={16} />
                  {plan.price}pt
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("trade.spotlight.balance")}</span>
          <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
            <PointIcon size={14} />
            {pointsLoading ? "…" : `${balance}pt`}
          </span>
        </div>

        {selected && !selected.overLimit && shortBy > 0 && !pointsLoading && (
          <div
            data-testid="spotlight-insufficient"
            className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-warning-soft px-3 py-2"
          >
            <p className="text-xs text-warning">{t("trade.spotlight.shortBy", { n: shortBy })}</p>
            <Button
              size="sm"
              variant="outline"
              className="h-8 shrink-0 bg-background text-xs"
              onClick={() => {
                onOpenChange(false);
                navigate("/point-shop");
              }}
            >
              {t("trade.spotlight.getPoints")}
            </Button>
          </div>
        )}

        <Button
          className="mt-4 w-full gap-1.5"
          disabled={!canBuy || buy.isPending}
          onClick={submit}
          data-testid="spotlight-confirm"
        >
          <Megaphone className="h-4 w-4" aria-hidden="true" />
          {selected
            ? t(endsAt ? "trade.spotlight.confirmExtend" : "trade.spotlight.confirm", {
                price: selected.plan.price,
              })
            : t("trade.spotlight.sheetTitle")}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
